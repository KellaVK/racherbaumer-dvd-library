# Racherbaumer Magic DVD Library

A web app for browsing, searching, and checking out DVDs from Jon Racherbaumer's magic collection. Built with React + Vite + Firebase, deployed on Cloudflare Pages.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Firebase project
1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project**
2. Enable **Firestore Database** (start in production mode)
3. Enable **Authentication** → Sign-in method → **Email/Password**
4. Register a **Web app** and copy the config values

### 3. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in your Firebase values from the previous step.

### 4. Deploy Firestore security rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, use firestore.rules
firebase deploy --only firestore:rules
```

### 5. Seed the DVD database

**Option A — Use the pre-loaded data (67 DVDs captured from the spreadsheet):**
```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Generate a service account key:
# Firebase Console → Project Settings → Service Accounts → Generate new key
# Save the JSON file, then set:
export FIREBASE_SERVICE_ACCOUNT=$(cat /path/to/serviceAccount.json)

node scripts/seedFirestore.js
```

**Option B — Import the full spreadsheet (~178 DVDs) via CSV:**
1. Open the Google Sheet → **Master List Order** tab
2. **File → Download → CSV (.csv)**
3. Save it as `scripts/dvds.csv`
4. Run:
```bash
export FIREBASE_SERVICE_ACCOUNT=$(cat /path/to/serviceAccount.json)
node scripts/seedFromCsv.js
```

### 6. Make yourself an admin
After seeding, register an account in the app, then in Firebase Console:
- Go to **Firestore** → `users` collection → find your document
- Change `role` from `"pending"` to `"admin"`

### 7. Run locally
```bash
npm run dev
```
Visit `http://localhost:5173`

---

## Deploying to Cloudflare Pages (subdomain of kellakruebbe.com)

### First deploy
1. Push the project to a GitHub repo
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → Connect to Git
3. Select your repo and configure:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Under **Environment variables**, add all 6 `VITE_FIREBASE_*` values from your `.env`
5. Click **Save and Deploy**

### Custom subdomain
In Cloudflare Pages → your project → **Custom domains** → Add `dvds.kellakruebbe.com` (or whatever path you prefer). Cloudflare will auto-configure the DNS since your domain is already on Cloudflare.

---

## How the checkout flow works

1. **User registers** → account created with `role: "pending"`
2. **Admin approves** → changes role to `"approved"` in the Admin panel
3. **User requests a DVD** → a `checkouts` document created with `status: "pending"`
4. **Admin approves checkout** → status → `"active"`, DVD marked as checked out
5. **Admin marks returned** → status → `"returned"`, DVD available again

---

## Adding AI enrichment (Phase 2)

Each DVD document has placeholder fields ready for enrichment:
- `aiSummary` — generated description
- `vanishingIncUrl` — link to Vanishing Inc listing
- `penguinUrl` — link to Penguin Magic listing
- `conjuringArchiveUrl` — link to Conjuring Archive

To enrich a DVD, the Admin panel's **✨ AI Enrich** button is wired up as a placeholder. The next phase will use a Firebase Function or a Cloudflare Worker that:
1. Searches Vanishing Inc / Penguin Magic / Conjuring Archive for the DVD title
2. Extracts description text
3. Calls Claude API to generate a clean summary
4. Writes back to the Firestore document

---

## Project structure
```
src/
  components/     Navbar, DVDCard, ProtectedRoute
  contexts/       AuthContext (Firebase auth + user roles)
  firebase/       config.js (env-var based)
  pages/          Home, DVDDetail, Login, Pending, Profile, Admin
scripts/
  dvds-seed.js    Pre-loaded DVD data from the spreadsheet
  seedFirestore.js  Uploads dvds-seed.js to Firestore
  seedFromCsv.js    Uploads a CSV export to Firestore
firestore.rules   Security rules (unauthenticated browse, role-gated writes)
public/_redirects Cloudflare SPA routing
```

---

## User roles

| Role | Can browse | Can request checkout | Admin panel |
|------|-----------|---------------------|-------------|
| (not logged in) | ✓ | — | — |
| pending | ✓ | — | — |
| approved | ✓ | ✓ | — |
| admin | ✓ | ✓ | ✓ |
