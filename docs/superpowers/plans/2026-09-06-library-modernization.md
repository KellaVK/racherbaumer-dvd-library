# Racherbaumer Magic DVD Library Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one coordinated modernization release covering administration, automatic Claude summaries for newly added DVDs, public discovery, lending reliability, visual polish, accessibility, and performance.

**Architecture:** Keep the React/Vite/Firebase application and split its monolithic pages into focused components, feature services, hooks, and normalization utilities. Use Firestore transactions for multi-document lending operations and a Cloudflare Pages Function for authenticated server-side Claude calls; deploy all workstreams together after emulator, component, build, responsive, and production smoke verification.

**Tech Stack:** React 18, React Router 6, Vite 6, Tailwind CSS 3, Firebase Authentication/Firestore 10, Fuse.js 7, Cloudflare Pages Functions, Anthropic SDK, Vitest, Testing Library, Firebase Rules Unit Testing.

**Spec:** `docs/superpowers/specs/2026-09-06-library-modernization-design.md`

## Global Constraints

- This is one coordinated release; internal task boundaries are test and review gates, not separate launches.
- Keep Firebase Authentication, Firestore, Cloudflare Pages, and all existing routes.
- Generate AI summaries only when a DVD is newly added or an admin explicitly retries one DVD.
- Do not add an AI review queue, bulk summarization, scheduled backlog scan, image uploads, or external notifications.
- Save a new DVD before requesting its summary; Claude failure must never roll back DVD creation.
- Store `ANTHROPIC_API_KEY` only as a Cloudflare secret; never expose it through Vite variables, Firestore, logs, browser storage, or version control.
- Preserve existing DVD, user, and checkout data without a destructive migration or bulk rewrite.
- Public catalog reads remain unauthenticated; catalog writes and summarization remain admin-only.
- Existing string-or-array DVD fields must normalize at the application boundary.
- All user-visible interactive flows require loading, success, empty, and failure feedback.
- Meet WCAG 2.1 AA contrast, keyboard, focus, dialog, labeling, and reduced-motion requirements described in the spec.

---

## File map

### Foundation

- `vitest.config.js`: unit/component test environments and setup.
- `src/test/setup.js`: jest-dom matchers and global cleanup.
- `src/utils/dvd.js`: normalization, placeholders, title similarity, filtering, and validation.
- `src/utils/date.js`: safe Firestore timestamp formatting.
- `src/components/ui/*`: reusable dialog, field, notice, toast, confirm, badge, and loading primitives.
- `src/contexts/ToastContext.jsx`: accessible global mutation feedback.
- `src/components/AppErrorBoundary.jsx`: recoverable render failure screen.

### Data and operations

- `src/services/dvds.js`: DVD create/update/delete and summary-request operations.
- `src/services/checkouts.js`: transactional request, approval, denial, return, and force-return operations.
- `src/services/users.js`: guarded role changes.
- `src/hooks/useAdminData.js`: scoped admin listeners and normalized derived counts.
- `src/hooks/useCatalogQuery.js`: URL-backed public search/filter/sort/view state.
- `firestore.rules`: self-role protection and `openRequests` ownership.
- `firestore.indexes.json`: queries for queues and admin filters.

### Cloudflare summary function

- `functions/api/summarize-dvd.js`: Pages Function request boundary.
- `functions/lib/firebase-rest.js`: authenticated Firestore REST reads and patches.
- `functions/lib/claude-summary.js`: prompt, response parsing, and status mapping.
- `functions/lib/auth.js`: bearer extraction and admin-profile validation.

### Feature UI

- `src/components/dvds/DVDForm.jsx`: shared controlled add/edit form.
- `src/components/dvds/DVDDialog.jsx`: responsive add/edit dialog and save workflow.
- `src/components/dvds/DVDCard.jsx`: public grid card moved from the generic component directory.
- `src/components/dvds/DVDListRow.jsx`: compact catalog row.
- `src/components/dvds/CatalogFilters.jsx`: search, facets, active chips, A–Z, and view toggle.
- `src/components/admin/OperationsOverview.jsx`: urgent work summary.
- `src/components/admin/CheckoutManager.jsx`: pending, active, and queued checkout actions.
- `src/components/admin/UserManager.jsx`: searchable approvals and guarded roles.
- `src/components/admin/DVDManager.jsx`: searchable/filterable catalog administration.
- `src/components/admin/StatsPanel.jsx`: existing statistics extracted from `Admin.jsx`.
- `src/pages/Admin.jsx`: route-level orchestration only.
- `src/pages/Home.jsx`: catalog composition and progressive rendering.
- `src/pages/DVDDetail.jsx`: normalized metadata, safe borrower display, and queued requests.
- `src/pages/Profile.jsx`: active, pending, queued, and history presentation.
- `src/components/Navbar.jsx`: accessible mobile state and route-close behavior.
- `src/index.css`, `tailwind.config.js`, `public/favicon.svg`: unified archival visual system.

### Documentation

- `.env.example`: server variable names without secrets.
- `README.md`: local testing, Cloudflare secret setup, deployment order, and smoke checks.

---

### Task 1: Test harness and DVD normalization contract

**Files:**
- Create: `vitest.config.js`
- Create: `src/test/setup.js`
- Create: `src/utils/dvd.js`
- Create: `src/utils/dvd.test.js`
- Create: `src/utils/date.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `normalizeDVD(raw)`, `normalizeList(value)`, `displayValue(value)`, `normalizeTitle(value)`, `titleSimilarity(a, b)`, `validateDVDForm(form)`, `filterDVDs(dvds, state)`, and `formatFirestoreDate(value, options)`.
- `normalizeDVD` returns stable arrays for `magician`, `magicType`, and `otherFeatures`; booleans for `featured`; and a default `aiSummaryStatus` derived from an existing summary.

- [ ] **Step 1: Add the test dependencies and scripts**

Add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `@firebase/rules-unit-testing` as dev dependencies. Add scripts: `test`, `test:watch`, and `test:rules`.

- [ ] **Step 2: Configure Vitest**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: { reporter: ['text', 'html'] },
  },
})
```

- [ ] **Step 3: Write failing utility tests**

```js
it('normalizes legacy string and placeholder metadata', () => {
  expect(normalizeDVD({ title: ' Test ', magician: 'A; B', magicType: ['?', 'Cards'], aiSummary: '' }))
    .toMatchObject({ title: 'Test', magician: ['A', 'B'], magicType: ['Cards'], featured: false, aiSummaryStatus: 'not_requested' })
})

it('validates year and vendor URLs', () => {
  expect(validateDVDForm({ title: 'X', year: '22', penguinUrl: 'http://bad.test' })).toEqual(expect.objectContaining({ year: expect.any(String), penguinUrl: expect.any(String) }))
})

it('finds a close title without treating numbered volumes as identical', () => {
  expect(titleSimilarity('Optical Dellusions', 'Optical Delusions')).toBeGreaterThan(0.85)
  expect(normalizeTitle('Card Magic Vol. 1')).not.toBe(normalizeTitle('Card Magic Vol. 2'))
})
```

- [ ] **Step 4: Run the utility test and verify failure**

Run: `npm test -- src/utils/dvd.test.js`

Expected: FAIL because `src/utils/dvd.js` does not exist.

- [ ] **Step 5: Implement the normalization and validation utilities**

Use one placeholder predicate for blank, `?`, `N/A`, `NA`, `unknown`, and punctuation-only values. Implement Levenshtein similarity locally so no new runtime dependency is needed. Return validation errors as `{ [field]: message }` and require an `https:` protocol for populated vendor URLs.

- [ ] **Step 6: Run utility tests and the production build**

Run: `npm test -- src/utils/dvd.test.js && npm run build`

Expected: utility tests PASS and Vite exits successfully. If Vite hangs under Node 26, run the same commands under the current Node LTS before changing application code and document the supported version in README.

- [ ] **Step 7: Commit the foundation**

```bash
git add package.json package-lock.json vitest.config.js src/test src/utils
git commit -m "test: add library normalization contract"
```

### Task 2: Accessible UI primitives and archival design tokens

**Files:**
- Create: `src/components/ui/Dialog.jsx`
- Create: `src/components/ui/Field.jsx`
- Create: `src/components/ui/Notice.jsx`
- Create: `src/components/ui/StatusBadge.jsx`
- Create: `src/components/ui/ConfirmDialog.jsx`
- Create: `src/components/ui/ToastViewport.jsx`
- Create: `src/contexts/ToastContext.jsx`
- Create: `src/components/AppErrorBoundary.jsx`
- Create: `src/components/ui/Dialog.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

**Interfaces:**
- Produces: `<Dialog open title onClose dirty size>`, `<Field label error hint>`, `<Notice tone>`, `<StatusBadge status>`, `useToast().push({ tone, message })`, and `<AppErrorBoundary>`.
- Dialog owns focus trap, Escape handling, scroll locking, dirty-close confirmation, and focus restoration.

- [ ] **Step 1: Write failing interaction tests for Dialog**

Test that opening focuses the first field, Tab stays inside, Escape closes a clean dialog, Escape asks before closing a dirty dialog, `aria-modal=true` is present, and focus returns to the opener.

- [ ] **Step 2: Run the dialog test and verify failure**

Run: `npm test -- src/components/ui/Dialog.test.jsx`

Expected: FAIL because Dialog is missing.

- [ ] **Step 3: Implement the primitives and context**

Use a portal to `document.body`; set `document.body.style.overflow = 'hidden'` while open; label the dialog with `aria-labelledby`; render `role=status` toasts with polite live announcements; and keep destructive confirmations explicit.

- [ ] **Step 4: Consolidate CSS tokens**

Add readable body typography, `--danger`, `--warning`, `--focus`, spacing/surface tokens, `:focus-visible`, reduced-motion rules, `.dialog-shell`, `.sheet-mobile`, `.toast`, and 44px minimum icon-button hit areas. Remove generic rounded styling from new admin surfaces while retaining restrained square/clipped Art Deco geometry.

- [ ] **Step 5: Install providers and the error boundary**

Wrap the router content with `AppErrorBoundary` and `ToastProvider`, and render one `ToastViewport` near the app root.

- [ ] **Step 6: Verify primitives**

Run: `npm test -- src/components/ui && npm run build`

Expected: interaction tests PASS and build PASS.

- [ ] **Step 7: Commit UI primitives**

```bash
git add src/components/ui src/components/AppErrorBoundary.jsx src/contexts/ToastContext.jsx src/App.jsx src/index.css tailwind.config.js
git commit -m "feat: add accessible archival UI primitives"
```

### Task 3: Transactional lending services and security rules

**Files:**
- Create: `src/services/checkouts.js`
- Create: `src/services/checkouts.test.js`
- Create: `tests/firestore.rules.test.js`
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

**Interfaces:**
- Produces: `requestDVD({ dvd, user, userProfile })`, `approveCheckout(checkout)`, `denyCheckout(checkout)`, `returnCheckout(checkout)`, and `forceReturnDVD(dvd, activeCheckout)`.
- Uses deterministic lock ID `${dvdId}_${uid}` in `openRequests`; lock status is `pending` or `active`.

- [ ] **Step 1: Write failing emulator/service tests**

Cover: request creates checkout and lock; repeated request rejects; unavailable request remains pending; approval atomically sets checkout/lock active and DVD borrower fields; double approval conflicts; denial and return remove the lock; return clears DVD fields; force-return adds `adminNote`; and legacy pending/active checkouts without locks can still be approved, denied, or returned safely.

- [ ] **Step 2: Write failing rules tests**

```js
it('prevents an admin from changing their own role', async () => {
  await assertFails(adminDb.doc('users/admin-1').update({ role: 'approved' }))
})

it('allows an approved user to create only their own pending lock', async () => {
  await assertSucceeds(userDb.doc('openRequests/dvd-1_user-1').set({ dvdId: 'dvd-1', requesterId: 'user-1', status: 'pending' }))
  await assertFails(userDb.doc('openRequests/dvd-1_other').set({ dvdId: 'dvd-1', requesterId: 'other', status: 'pending' }))
})
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- src/services/checkouts.test.js tests/firestore.rules.test.js`

Expected: FAIL because the services and rules are not implemented.

- [ ] **Step 4: Implement transaction services**

Generate the checkout reference before `runTransaction`, read the deterministic lock and relevant DVD/checkout documents in the transaction, and throw typed errors `duplicate-request`, `dvd-unavailable`, `stale-checkout`, or `missing-record`. Before the transaction, query legacy pending/active checkouts for the same user and DVD so pre-release records also prevent duplicates. Approval updates an existing lock or creates an active compatibility lock for a legacy checkout; denial and return delete the lock only when it exists.

- [ ] **Step 5: Harden Firestore rules**

Add `openRequests/{lockId}` with owner/admin reads, owner-only pending creation, and admin-only update/delete. Require a user-created checkout to have a matching `openRequests` document after the atomic write, and require a user-created lock to point to its matching checkout after the same write. Change user updates so `userId == uid()` requires an unchanged role even when the caller is an admin; admins may update roles only when `userId != uid()`.

- [ ] **Step 6: Add queue indexes**

Add checkout indexes for `dvdId + status + requestedAt` and `requesterId + status + requestedAt`.

- [ ] **Step 7: Verify transactions and rules**

Run: `npm test -- src/services/checkouts.test.js tests/firestore.rules.test.js`

Expected: all transaction and security tests PASS.

- [ ] **Step 8: Commit lending safety**

```bash
git add src/services/checkouts.js src/services/checkouts.test.js tests/firestore.rules.test.js firestore.rules firestore.indexes.json
git commit -m "feat: make lending operations transactional"
```

### Task 4: Cloudflare Claude summarization endpoint

**Files:**
- Create: `functions/api/summarize-dvd.js`
- Create: `functions/lib/auth.js`
- Create: `functions/lib/firebase-rest.js`
- Create: `functions/lib/claude-summary.js`
- Create: `functions/lib/claude-summary.test.js`
- Create: `functions/api/summarize-dvd.test.js`
- Modify: `.gitignore`
- Modify: `.env.example`

**Interfaces:**
- Produces: Pages handler `onRequestPost(context)` and `buildSummary({ dvd, anthropic, model }) -> { status, summary, model }`.
- Endpoint input: `{ dvdId: string }`; authorization: `Bearer <Firebase ID token>`; response: `202 { accepted: true }`.

- [ ] **Step 1: Write failing prompt/parser tests**

Cover rich metadata, blank metadata, valid `{ "summary": "..." }`, fenced JSON, empty summary mapping to `insufficient`, malformed output mapping to `failed`, and a prompt that explicitly forbids unsupported facts.

- [ ] **Step 2: Write failing endpoint tests**

Cover missing bearer token (`401`), valid non-admin (`403`), missing DVD (`404`), accepted admin request (`202`), successful background patch, insufficient patch, and failed patch without overwriting existing metadata.

- [ ] **Step 3: Run function tests and verify failure**

Run: `npm test -- functions`

Expected: FAIL because the function modules do not exist.

- [ ] **Step 4: Implement authenticated Firestore REST helpers**

Use `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`. Decode Firestore REST values only for fields required by the endpoint. Every request forwards the Firebase bearer token; admin authorization succeeds only when the caller's own user document has `role.stringValue === 'admin'`.

- [ ] **Step 5: Implement strict Claude summarization**

Use the Anthropic SDK with `max_tokens` sized for a concise 60–140 word description. Supply only saved metadata. Require JSON with a single `summary` string, forbid guessing, and return insufficient when the title plus metadata do not support a useful description.

- [ ] **Step 6: Implement the Pages Function**

Authorize and load the DVD before returning. Call `context.waitUntil()` with generation and Firestore patching. Patch only `aiSummary`, `aiSummaryStatus`, `aiSummaryModel`, and `aiSummaryUpdatedAt`; on failure patch only status/timestamp. Never log the token, secret, prompt payload, or summary text.

- [ ] **Step 7: Protect local worker secrets**

Ignore `.dev.vars` and document only blank `ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`, and `CLAUDE_MODEL` names in `.env.example`.

- [ ] **Step 8: Verify and commit the endpoint**

Run: `npm test -- functions && npm run build`

```bash
git add functions .gitignore .env.example
git commit -m "feat: summarize new DVDs with Claude"
```

### Task 5: DVD and user service layer

**Files:**
- Create: `src/services/dvds.js`
- Create: `src/services/dvds.test.js`
- Create: `src/services/users.js`
- Create: `src/services/users.test.js`

**Interfaces:**
- Produces: `createDVD(form) -> dvdId`, `updateDVD(id, form)`, `deleteDVD(id)`, `setFeatured(id, featured)`, `requestSummary(id)`, and `setUserRole({ currentUid, userId, role })`.
- `createDVD` stores normalized arrays, timestamps, borrower nulls, vendor URLs, blank summary, and `aiSummaryStatus: generating`, then requests summarization after the Firestore create resolves.

- [ ] **Step 1: Write failing service tests**

Assert normalized write payloads, update timestamps, summary request headers/body, creation surviving endpoint failure, retry status changes, and rejection of self-role changes.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/services/dvds.test.js src/services/users.test.js`

Expected: FAIL because service modules are missing.

- [ ] **Step 3: Implement DVD operations**

Call `auth.currentUser.getIdToken()` immediately before `/api/summarize-dvd`. `createDVD` returns once Firestore succeeds and starts `requestSummary(id)` without making the create promise depend on Claude. Catch summary-request failure and set `aiSummaryStatus: failed` through the authenticated admin client.

- [ ] **Step 4: Implement guarded user roles**

Reject `currentUid === userId`; accept only `pending`, `approved`, or `admin`; require explicit UI confirmation for promotion to admin while keeping the service deterministic.

- [ ] **Step 5: Verify and commit services**

Run: `npm test -- src/services/dvds.test.js src/services/users.test.js`

```bash
git add src/services/dvds.js src/services/dvds.test.js src/services/users.js src/services/users.test.js
git commit -m "refactor: centralize DVD and user operations"
```

### Task 6: Responsive Add/Edit DVD experience

**Files:**
- Create: `src/components/dvds/DVDForm.jsx`
- Create: `src/components/dvds/DVDDialog.jsx`
- Create: `src/components/dvds/DVDDialog.test.jsx`

**Interfaces:**
- Produces: `<DVDDialog open dvd catalog onClose onSaved>`; `dvd=null` means Add and a DVD object means Edit.
- Consumes: Task 1 validation/similarity, Task 2 dialog/fields/toasts, and Task 5 DVD services.

- [ ] **Step 1: Write failing component tests**

Cover all fields including `otherFeatures`, add/edit prefill, four-digit year, HTTPS URLs, exact and close duplicate warnings, explicit continue after warning, removable parsed chips, dirty-close protection, Firestore save success, save failure preservation, nonblocking summary status, and stacked mobile actions.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/components/dvds/DVDDialog.test.jsx`

Expected: FAIL because the editor is missing.

- [ ] **Step 3: Implement the form sections**

Render Identity, Classification, Contents, and Enrichment sections. Use semicolon entry with blur/Enter parsing into chips for magician, type, and other features. Existing `aiSummary` is editable only in Edit mode; retry calls `requestSummary(dvd.id)`.

- [ ] **Step 4: Implement save and duplicate behavior**

Validate before mutation. Normalize titles and use similarity >= 0.84 for warnings, excluding the edited record. Require a second explicit “Add Anyway” action after a warning. Close only after Firestore success and announce that summarization is running.

- [ ] **Step 5: Verify responsive and keyboard behavior**

Run component tests, then manually test at 390×667, 768×1024, and 1440×900. Confirm internal scrolling, sticky actions, reachable close control, focus trap, Escape, and no horizontal overflow.

- [ ] **Step 6: Commit the editor**

```bash
git add src/components/dvds
git commit -m "feat: add responsive DVD editor"
```

### Task 7: Admin dashboard decomposition and operations overview

**Files:**
- Create: `src/hooks/useAdminData.js`
- Create: `src/components/admin/OperationsOverview.jsx`
- Create: `src/components/admin/CheckoutManager.jsx`
- Create: `src/components/admin/UserManager.jsx`
- Create: `src/components/admin/DVDManager.jsx`
- Create: `src/components/admin/StatsPanel.jsx`
- Create: `src/components/admin/Admin.test.jsx`
- Modify: `src/pages/Admin.jsx`

**Interfaces:**
- `useAdminData()` returns `{ checkouts, users, dvds, loading, errors, counts }`.
- Managers consume normalized arrays plus narrow service callbacks; Admin owns active tab and selected dialog state.

- [ ] **Step 1: Write failing admin workflow tests**

Cover overview urgency counts, jumping to filtered tabs, oldest pending age, user search/role filters, prominent approval, admin-promotion confirmation, blocked self-demotion, DVD filters/sorts, edit/feature/retry actions, transactional checkout conflicts, and action-specific errors.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/components/admin/Admin.test.jsx`

Expected: FAIL because extracted components are missing.

- [ ] **Step 3: Implement scoped admin data hook**

Normalize all DVDs on ingress. Give each listener its own loading/error state. Derive pending, active, queued, failed-summary, and oldest-request values without putting filtered arrays into React state.

- [ ] **Step 4: Implement Operations and managers**

Default Admin to `operations`. Use consistent square surfaces, semantic headings, responsive mobile cards, and shared status badges. Route all mutations through services and translate typed errors into specific notices/toasts.

- [ ] **Step 5: Replace monolithic Admin implementation**

Keep `src/pages/Admin.jsx` responsible only for tab navigation, route-level layout, hook invocation, and selected dialogs. Remove duplicated inline subcomponents after coverage passes.

- [ ] **Step 6: Verify admin workflows and build**

Run: `npm test -- src/components/admin src/components/dvds && npm run build`

- [ ] **Step 7: Commit admin modernization**

```bash
git add src/hooks/useAdminData.js src/components/admin src/pages/Admin.jsx
git commit -m "feat: modernize admin operations"
```

### Task 8: URL-backed catalog discovery and progressive rendering

**Files:**
- Create: `src/hooks/useCatalogQuery.js`
- Create: `src/hooks/useCatalogQuery.test.jsx`
- Create: `src/components/dvds/CatalogFilters.jsx`
- Create: `src/components/dvds/DVDListRow.jsx`
- Move: `src/components/DVDCard.jsx` to `src/components/dvds/DVDCard.jsx`
- Modify: `src/pages/Home.jsx`

**Interfaces:**
- `useCatalogQuery(dvds)` returns `{ state, setSearch, setFilter, removeFilter, clearFilters, results, facets }` backed by `useSearchParams`.
- Query keys: `q`, `availability`, `magician`, `type`, `era`, `featured`, `summary`, `sort`, `view`, and `letter`.

- [ ] **Step 1: Write failing URL/filter tests**

Cover URL hydration, URL updates, back/forward restoration, individual chip removal, array/string normalization, placeholder omission, combined facets, A–Z letter filtering, newest fallback for missing timestamps, and grid/list persistence.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/hooks/useCatalogQuery.test.jsx`

Expected: FAIL because the hook is missing.

- [ ] **Step 3: Implement query state and facets**

Keep Fuse search, apply deterministic filters afterward, and preserve filter sort when returning from details via URL. Build magician/type/year facets from normalized DVDs. Era options are Before 1980, 1980s, 1990s, 2000s, 2010s, and 2020s.

- [ ] **Step 4: Implement catalog controls**

Add labeled search, responsive facet disclosure, active chips, clear-all, sort, grid/list toggle, and conditional A–Z navigation. Expose `aria-expanded`, `aria-controls`, current-result count, and keyboard focus styles.

- [ ] **Step 5: Implement progressive results**

Render 48 results initially and add 48 per Load More action. Reset the visible count when query state changes. Show a featured shelf only when no search/filter is active and featured items exist.

- [ ] **Step 6: Verify and commit discovery**

Run: `npm test -- src/hooks/useCatalogQuery.test.jsx src/components/dvds && npm run build`

```bash
git add src/hooks/useCatalogQuery.js src/hooks/useCatalogQuery.test.jsx src/components/dvds src/pages/Home.jsx
git commit -m "feat: improve catalog discovery"
```

### Task 9: DVD detail and lending account experience

**Files:**
- Create: `src/pages/DVDDetail.test.jsx`
- Create: `src/pages/Profile.test.jsx`
- Modify: `src/pages/DVDDetail.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/Pending.jsx`

**Interfaces:**
- Consumes: `normalizeDVD`, `requestDVD`, existing AuthContext, and normalized checkout statuses.
- Produces: safe detail presentation and account sections for active, pending, queued, returned, and denied requests.

- [ ] **Step 1: Write failing page tests**

Assert that a checked-out public DVD renders `checkedOutByName` without requesting `/users/{uid}`; anonymous users see sign-in; pending users can browse but not request; approved users can request an unavailable item as a queued request; duplicate open requests disable the action; and Profile labels queued requests without exposing other borrowers.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/pages/DVDDetail.test.jsx src/pages/Profile.test.jsx`

Expected: at least the protected-profile read and queued-request cases FAIL.

- [ ] **Step 3: Refactor DVDDetail**

Use a live DVD listener, normalize metadata, remove the protected user read, preserve query-string catalog state in the Back link, and call `requestDVD`. Translate unavailable state to “Join Request Queue” and surface duplicate/transaction errors.

- [ ] **Step 4: Refactor Profile and pending copy**

Separate active, pending-available, queued-unavailable, and history sections. Keep exact queue position private. Change Pending copy to state that browsing is already available while borrowing awaits approval.

- [ ] **Step 5: Verify and commit lending UI**

Run: `npm test -- src/pages/DVDDetail.test.jsx src/pages/Profile.test.jsx && npm run build`

```bash
git add src/pages/DVDDetail.jsx src/pages/DVDDetail.test.jsx src/pages/Profile.jsx src/pages/Profile.test.jsx src/pages/Pending.jsx
git commit -m "feat: clarify borrowing and waitlist status"
```

### Task 10: Navigation, branding, and responsive visual polish

**Files:**
- Create: `src/components/Navbar.test.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`
- Modify: `public/favicon.svg`
- Modify: `index.html`

**Interfaces:**
- Navbar exposes correct current-page state and mobile `aria-expanded`; route changes close the menu.
- Favicon is a custom geometric JR/catalog mark with no emoji or remote asset.

- [ ] **Step 1: Write failing navigation tests**

Cover accessible menu name, expanded state, route-close behavior, focus visibility, admin link visibility, and sign-out failure feedback.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- src/components/Navbar.test.jsx`

Expected: accessibility-state tests FAIL against the current hamburger.

- [ ] **Step 3: Implement navigation behavior**

Close on pathname change, label the button “Open navigation”/“Close navigation,” set `aria-controls`, set `aria-current=page` on active links, and show logout errors without navigating away.

- [ ] **Step 4: Complete visual-system polish**

Apply body sans-serif typography, reduce tracked small-copy spacing, raise muted-text contrast, unify admin/public surfaces, improve card focus/hover parity, ensure long titles and URLs wrap, and remove redundant ornamentation. Retain Playfair for display headings and Josefin for labels.

- [ ] **Step 5: Replace the favicon**

Create an original SVG using a warm-black square, champagne-gold geometric border, and interlocked `J`/`R` letterforms. Update the document theme color and accessible title metadata.

- [ ] **Step 6: Verify responsive layouts**

Manually inspect anonymous, pending, approved, and admin states at 390×667, 768×1024, 1280×720, and 1440×900. Confirm no clipped dialogs, horizontal scroll, hidden controls, or low-contrast status text.

- [ ] **Step 7: Commit visual polish**

```bash
git add src/components/Navbar.jsx src/components/Navbar.test.jsx src/index.css tailwind.config.js public/favicon.svg index.html
git commit -m "feat: polish archival responsive design"
```

### Task 11: Documentation, compatibility, and release verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `firebase.json`
- Modify: `public/_redirects`
- Test: all `*.test.*` and `tests/firestore.rules.test.js`

**Interfaces:**
- Produces: reproducible local setup, test, secret, preview, and deployment instructions.
- No production data migration command is added.

- [ ] **Step 1: Update setup and deployment documentation**

Document the supported Node LTS version, `npm test`, Firebase emulator requirements, local Pages Function environment, Cloudflare secret entry, Firestore rules/index deployment, Cloudflare deployment order, and role-based smoke checklist. State explicitly that the existing backlog is untouched.

- [ ] **Step 2: Configure Firebase and SPA/function routing**

Ensure Firebase emulator config covers Auth and Firestore. Keep the SPA fallback while allowing `/api/*` to resolve to Pages Functions before the fallback.

- [ ] **Step 3: Run the complete automated suite**

Run: `npm test`

Expected: all unit, component, service, function, and rules tests PASS with no unhandled promise rejection.

- [ ] **Step 4: Run production verification**

Run: `npm run build`

Expected: Vite completes with no errors and no secret value appears in `dist`.

Run a repository search for `ANTHROPIC_API_KEY` and confirm occurrences exist only in server code, ignored local-secret naming, and documentation—not in `src`, `dist`, or committed values.

- [ ] **Step 5: Run local role and viewport smoke tests**

Using emulated test accounts, verify anonymous browse; pending browse/no request; approved available request; approved unavailable queue; admin approval; admin add/edit/feature/delete; successful/failed summary; checkout approval conflict; return; and blocked self-demotion across the four target viewports.

- [ ] **Step 6: Inspect final diff and preserve unrelated work**

Run `git status --short`, `git diff --check`, and a scoped diff against the release files. Confirm the pre-existing script, enrichment-output, package, and `.DS_Store` changes were neither discarded nor silently folded into unrelated commits.

- [ ] **Step 7: Commit release documentation**

```bash
git add README.md .env.example package.json package-lock.json firebase.json public/_redirects
git commit -m "docs: prepare library modernization release"
```

- [ ] **Step 8: Perform deployment smoke verification**

After the project owner enters `ANTHROPIC_API_KEY` in Cloudflare, deploy rules/indexes and one Cloudflare Pages preview. Add one clearly labeled test DVD, observe summary completion or a retryable failure, exercise the checkout lifecycle, delete the test DVD through the admin interface, and verify preserved checkout history.

---

## Final release gate

The release is ready only when:

- Every automated test and the production build passes.
- No Claude secret is present in frontend assets or Git history created by this work.
- Firestore rules tests prove role and open-request boundaries.
- New-DVD creation survives Claude failure.
- Existing unsummarized DVDs remain untouched.
- Checkout and DVD availability cannot diverge in tested concurrent actions.
- Add/Edit DVD remains usable at the shortest supported mobile viewport.
- Anonymous, pending, approved, and admin smoke flows pass.
- The final diff contains no accidental modification or removal of the user's pre-existing work.
