# Racherbaumer Magic DVD Library Modernization

**Date:** 2026-09-06  
**Release model:** One coordinated release with independently testable workstreams  
**Product direction:** A balanced historical archive and practical lending catalog

## Purpose

Modernize the public library and its administration without changing its core mission: preserve Jon Racherbaumer's collection, help magicians discover what it contains, and make physical lending easy to operate.

The release will improve the visual system, browsing, DVD management, user approval, checkout reliability, responsive behavior, accessibility, and performance. Newly added DVDs will automatically attempt an AI summary through the Claude API. Existing DVDs without summaries will not be processed automatically, and there will be no editorial review queue in this release.

## Success criteria

- The public catalog remains useful without signing in and is substantially easier to browse on desktop and mobile.
- An admin can add, edit, feature, retry summarization for, and safely delete a DVD from the website.
- The Add/Edit DVD interface never clips on a short or narrow viewport and is fully keyboard accessible.
- An admin can find and approve pending users quickly, with clear success and failure feedback.
- Checkout approval, denial, and return actions cannot leave the checkout record and DVD availability in contradictory states.
- A user cannot accidentally create repeated open requests for the same DVD.
- An unavailable DVD can still receive a queued request, creating a simple waitlist ordered by request date.
- Every newly added DVD is saved even when Claude is unavailable; summarization status remains visible to admins and can be retried.
- The Claude API key is never included in frontend code, Firestore, browser storage, logs, or version control.
- The existing catalog, users, checkout history, and published summaries continue to work without a destructive migration.

## Non-goals

- Automatically generating summaries for the existing unsummarized backlog.
- Requiring editorial approval before an AI summary is displayed.
- Adding cover-art acquisition or image uploads.
- Sending email, SMS, or push notifications.
- Replacing Firebase Authentication, Firestore, or Cloudflare Pages.
- Building a general-purpose collection-management system.

## Delivery structure

This is one release, implemented as five workstreams that merge into a single launch:

1. Shared design system and reusable UI primitives.
2. Admin operations and automatic summarization.
3. Public discovery and responsive presentation.
4. Lending workflow and data consistency.
5. Accessibility, performance, documentation, and release verification.

Workstreams may be developed and tested separately, but none is presented as a separate product release.

## Architecture

### Frontend

The existing React/Vite single-page application remains the frontend. Large page files will be split into focused components and hooks, while preserving existing routes. Shared primitives will cover buttons, fields, notices, badges, dialogs, loading states, and confirmation actions so the public and admin areas use one coherent visual language.

Firestore listeners remain appropriate for pending admin work and a user's current requests. The full public catalog will still be loaded client-side because the current collection size is modest and Fuse.js already powers flexible search. Rendering will be progressively limited so hundreds of cards are not mounted at once.

### Server-side summarization

A Cloudflare Pages Function at `POST /api/summarize-dvd` will call the Claude API. It will run on the Cloudflare free tier and use these server-side environment values:

- `ANTHROPIC_API_KEY`: stored as a Cloudflare secret.
- `FIREBASE_PROJECT_ID`: non-secret project identifier.
- `CLAUDE_MODEL`: optional model override with a conservative default in code.

The function accepts a Firebase ID token and the DVD identifier. It verifies the token and admin role by reading the caller's Firestore user document through the Firestore REST API. It then reads the saved DVD document from Firestore, prompts Claude using that document's metadata, and patches the DVD through the Firestore REST API using the authenticated admin token.

The endpoint returns `202 Accepted` after authorization and schedules the generation task with the Cloudflare execution context. The DVD is already saved at this point. Completion or failure appears through the existing Firestore listener.

No service-account private key is required by the website function. The browser never receives the Anthropic secret.

### Firestore

Existing collections remain in place:

- `dvds`: public catalog documents.
- `users`: private profiles and roles.
- `checkouts`: lending requests and history.

No destructive migration is required. New fields use safe defaults when absent.

## DVD data model additions

DVD documents may add:

- `updatedAt`: Firestore timestamp of the last admin edit.
- `featured`: boolean, default `false`.
- `aiSummaryStatus`: `not_requested`, `generating`, `complete`, `insufficient`, or `failed`.
- `aiSummaryUpdatedAt`: timestamp of the last summary attempt.
- `aiSummaryModel`: model identifier used for the last successful summary.

`aiSummary` remains the published text field used by the existing detail page. Because summaries are not reviewed in this release, a successful automatic result is written directly to this field. The detail page continues labeling it as an AI summary.

Error details will not be stored on the public DVD document. The admin UI will show a generic retryable failure state, while diagnostic details remain in Cloudflare logs.

## Automatic summary flow

1. The admin submits a valid new DVD.
2. The browser creates the Firestore document with `aiSummaryStatus: generating`.
3. The dialog closes and confirms that the DVD was added; it does not wait for Claude.
4. The browser sends the DVD ID and current Firebase ID token to the Pages Function.
5. The function verifies that the caller is an admin.
6. Claude receives the title plus entered magician, type, producer, year, features, and notes.
7. The prompt forbids invented facts and permits an empty result when the metadata is insufficient.
8. A successful result updates `aiSummary`, `aiSummaryStatus`, model, and timestamp.
9. An empty but valid result sets `aiSummaryStatus: insufficient`.
10. A service or parsing error sets `aiSummaryStatus: failed` without deleting or changing the DVD's entered metadata.

The admin can retry a failed, insufficient, or missing summary from the DVD row or editor. The release will not include a bulk action, scheduled job, or automatic scan of old DVDs.

## Admin experience

### Dashboard

The initial admin view becomes a concise Operations overview containing:

- Pending checkout count and oldest-request age.
- DVDs currently out.
- Pending user count.
- New-DVD summary attempts that are generating, insufficient, or failed.
- Direct links into filtered Checkouts, Users, and DVDs views.

The existing statistics remain available but no longer compete with urgent work.

### DVD management

The DVDs view gains:

- Search across title, magician, producer, type, and year.
- Filters for availability, featured state, and summary status.
- Sorting by title, magician, created date, and last updated date.
- Add, edit, feature/unfeature, retry summary, view history, force return, and delete actions.
- Clear pending, success, and failure feedback for each mutation.

Deletion keeps checkout history, as it does today, and clearly explains that behavior. Checked-out deletion remains strongly warned. Force-return and delete require accessible confirmation dialogs.

### DVD editor

Add and Edit use the same component. On wide screens it is a large dialog; on small screens it becomes a full-height sheet. It includes:

- Identity: title, magician or magicians, producer, and release year.
- Classification: magic types and featured status.
- Contents: notes and other featured performers.
- Enrichment: vendor links, current AI summary, status, and retry control when editing.

The form uses responsive single-column/two-column layouts, a sticky action footer, internal scrolling, body scroll locking, Escape-to-close, focus trapping, autofocus, restored focus, semantic dialog labeling, inline validation, and visible save errors. Cancel never discards changes without confirmation after the form becomes dirty.

Semicolon parsing remains accepted for quick entry, but values are displayed as removable chips after parsing. Title is required. Year is either blank or a plausible four-digit value. URLs must be blank or valid `https` URLs.

Before creation, the browser compares the normalized title with the loaded catalog and warns about exact or close matches. The admin may still continue because separate volumes and editions can legitimately resemble one another.

### User administration

The Users view puts pending accounts first and supports search and role filters. Each pending user shows name, email, registration date, and a prominent Approve action. Role changes show progress and confirmation feedback.

Promoting a user to admin requires confirmation. Demoting the currently signed-in admin is blocked in the interface. Firestore rules also prevent a user from changing their own role, including an admin's self-demotion; another admin is required.

User checkout history remains accessible from the row and uses the same responsive dialog system.

## Public catalog experience

### Visual direction

The dark warm-black, ivory, muted green, and champagne-gold palette remains. The release strengthens the archival Art Deco identity without making controls ornamental or difficult to read.

- Playfair Display remains for titles and display moments.
- Josefin Sans remains for labels, while body copy uses a more readable system sans-serif stack.
- Small labels use less letter spacing and higher contrast.
- Decorative lines and diamonds are reduced where they interrupt scanning.
- Surfaces remain square or subtly clipped rather than mixing square public cards with generic rounded admin panels.
- A custom geometric `JR`/catalog-mark SVG replaces the emoji favicon.
- Motion stays brief and respects reduced-motion preferences.

### Browse page

The browse page gains:

- A clearer count and availability summary after loading.
- Search with an explicit label, clear button, and result context.
- Filters for availability, magician, type, year/era, featured status, and summary presence.
- Title and magician sorting plus newest-added sorting when timestamps are available.
- Active-filter chips with individual removal and a clear-all action.
- URL query parameters for search, filters, sort, and view mode so state survives detail navigation and links can be shared.
- Grid and compact-list views.
- A–Z jump navigation when sorting by title.
- A featured shelf when admins have marked DVDs as featured.
- Progressive rendering with a Load More control to avoid mounting the full catalog immediately.

The catalog avoids displaying raw placeholder values such as `?`, `N/A`, or empty punctuation as meaningful metadata. Unknown values are omitted or presented as “Unknown” only when the label is useful.

### Cards and detail pages

Cards prioritize title, magician, a small number of types, and availability. Secondary metadata does not compete with those fields. Keyboard focus is as visible as pointer hover.

The detail page improves hierarchy, link wrapping, long-title behavior, and summary readability. Contents and AI summary disclosures remain, but state, focus, and expanded styling become clearer. The page uses `checkedOutByName` already stored on the DVD rather than attempting to read another user's protected profile.

Unavailable items allow an approved user to join the request queue instead of presenting a dead end.

## Lending workflow

### Requesting and waitlist behavior

An approved user can request an available or unavailable DVD. A request for an unavailable DVD is described as joining its queue. Pending requests are ordered by `requestedAt`.

Before creating a request, the client checks for an existing pending or active request by the same user for the same DVD. The create operation uses a deterministic open-request key in a new `openRequests` collection:

- Document ID: `{dvdId}_{uid}`.
- Fields: `dvdId`, `requesterId`, `checkoutId`, `status`, and `createdAt`.

The checkout record and open-request lock are created together in a Firestore transaction. Security rules require the lock to belong to the authenticated approved user. Denial and return close the checkout and delete the lock atomically. Existing checkout history stays unchanged.

### Admin processing

Approval uses a Firestore transaction that reads the DVD, checkout, and open-request lock; verifies that the checkout is still pending and the DVD is still available; then marks the checkout and lock active and the DVD checked out in one commit. If another admin acted first, the interface refreshes and explains the conflict.

Denial and return are also transactional. Returning clears DVD availability, completes the active checkout, and removes the open-request lock. Other pending requests remain ordered for admin review. The next person is not automatically approved.

Force return follows the same transaction-safe path and records an admin note.

### User account page

The account page becomes a status-oriented lending view:

- Active loans with checkout and return information when present.
- Pending available-item requests.
- Queued unavailable-item requests with a clear waiting status. Exact queue position remains admin-only because users cannot read other borrowers' requests.
- Returned and denied history.
- Clear links back to each DVD.

No delivery notifications are promised in this release.

## Security rules

Rules will continue allowing public DVD reads and admin-only catalog writes. Changes will:

- Add scoped `openRequests` permissions.
- Require users to create only their own open-request lock with an initial pending status.
- Allow users to read only their own lock; admins can read and manage all locks.
- Prevent all users, including admins, from changing their own role document's `role` field.
- Preserve admin control of other users' roles.
- Keep checkout status mutations admin-only.

The Pages Function performs its own admin-role check before using the Claude secret. Firestore rules remain the final authority for DVD updates.

## Error handling and feedback

- Firestore listeners expose loading, success, empty, and error states instead of silently stopping.
- Mutating buttons disable only for the affected action and show progress text.
- Successful mutations produce a short accessible toast.
- Failed mutations preserve the form or current page state and offer retry.
- Transaction conflicts explain that the underlying record changed and reload the latest state.
- AI failure never rolls back DVD creation.
- The global interface includes a recoverable error boundary for unexpected rendering failures.

## Accessibility and responsive behavior

- Every icon-only control has an accessible name.
- Dialogs trap focus, restore it on close, and close with Escape when safe.
- Form errors are connected to fields and announced.
- Color is never the only indicator of role, availability, or status.
- Text and interactive controls meet WCAG 2.1 AA contrast targets.
- Tap targets are at least 44 by 44 CSS pixels where practical.
- Tables or dense rows collapse into labeled mobile cards.
- The mobile navigation closes on route changes and exposes its expanded state.
- Reduced-motion preferences disable nonessential transitions.

## Performance

- Public catalog computation remains memoized.
- Initial card rendering is capped and expanded incrementally.
- Admin tabs subscribe only to data they need where practical; urgent counts can remain live.
- Derived filters normalize arrays and strings through shared utilities instead of repeating parsing logic.
- Large components are split to reduce rerender scope and improve testability.
- No images or external textures are required for first render.

## Component boundaries

The implementation will introduce focused modules rather than extending the current monolithic Admin page:

- `components/ui`: dialog, field, notice, toast, confirmation, badges, and loading primitives.
- `components/dvds`: editor, filters, card/list row, metadata display, and admin actions.
- `components/admin`: operations overview, checkout queue, user management, DVD management, and statistics.
- `hooks`: catalog query-state synchronization, admin collection listeners, and toast state.
- `utils`: metadata normalization, title similarity, date formatting, and validation.
- `services`: Firestore DVD, user, checkout, and summarization operations.
- `functions/api`: Cloudflare Pages Function for Claude summarization.

Each service exposes a narrow operation so UI components do not coordinate multi-document writes directly.

## Migration and compatibility

- Missing new DVD fields are interpreted through defaults in normalization utilities.
- Existing published `aiSummary` values continue displaying without regeneration.
- Existing checkout documents remain history and appear in current views.
- `openRequests` locks are created only for new requests. Existing pending or active checkouts are treated as open by compatibility queries until resolved.
- Existing string-versus-array differences for magician and magic type remain normalized at the application boundary.
- No existing document is bulk rewritten during deployment.

## Testing strategy

### Automated tests

- Unit tests for normalization, filtering, title similarity, validation, URL-state parsing, and date formatting.
- Component tests for DVD editor validation, dirty-close confirmation, responsive action layout, user approval, filter chips, and request-state rendering.
- Service tests against the Firebase emulator for request creation, duplicate locks, approval conflicts, denial, return, and role protections.
- Pages Function tests for missing/invalid tokens, non-admin callers, successful Claude output, insufficient metadata, malformed model output, API failure, and Firestore patch failure.
- Security-rules tests for public catalog access, self-profile access, admin writes, self-role-change denial, and open-request ownership.

### Manual verification

- Desktop, tablet, short laptop, and narrow mobile viewports.
- Keyboard-only navigation and visible focus.
- Screen-reader dialog names and status announcements.
- Add a DVD with rich metadata and observe successful background summarization.
- Add a DVD with insufficient metadata and retry from the editor.
- Simulate Claude failure and verify the DVD remains saved.
- Approve and deny users, including attempted self-demotion.
- Create concurrent checkout actions and verify no contradictory state.
- Browse and request DVDs as anonymous, pending, approved, and admin users.
- Production build and Cloudflare Pages preview before release.

## Deployment

1. Deploy updated Firestore rules and indexes.
2. Configure `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`, and optional `CLAUDE_MODEL` in Cloudflare Pages environment settings.
3. Deploy the Pages Function and application as one Cloudflare Pages release.
4. Run production smoke tests using each user role.
5. Verify one low-risk test DVD summary and remove the test record through the admin interface.

The API key must be entered directly into Cloudflare's secret/environment interface by the project owner. It must never be sent through chat or committed to a file.
