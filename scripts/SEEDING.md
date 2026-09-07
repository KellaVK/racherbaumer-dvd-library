# DVD Database Seeding Guide

Run these steps in order any time you need to push DVDs into Firestore.

---

## Prerequisites

You need your Firebase service account JSON. Get it from:

> Firebase Console → Project Settings → Service Accounts → **Generate new private key**

Download the `.json` file and keep it somewhere safe (never commit it to git).

---

## Step 1 — Set your credentials

In your terminal, paste your service account JSON as an environment variable:

```bash
export FIREBASE_SERVICE_ACCOUNT='<paste the entire contents of your .json key file here>'
```

This only lasts for your current terminal session. You'll need to re-run it if you open a new window.

---

## Step 2 — Seed the hand-curated entries

This seeds the ~63 entries in `scripts/dvds-seed.js` — the ones with richer metadata (magicType, producer, notes).

```bash
npm run seed
```

Expected output:
```
Seeding 63 DVDs…
✓ Done. 63 DVDs written to Firestore.
```

---

## Step 3 — Seed from the CSV

This imports `scripts/dvds.csv` (~270 entries). It automatically checks what's already in Firestore and skips any duplicates, so it's safe to run even if Step 2 already wrote some overlapping titles.

```bash
npm run seed:csv
```

Expected output:
```
CSV loaded: 269 rows
Fetching existing Firestore titles for dedup...
  63 existing docs found
  206 new entries to write (63 skipped as duplicates)
  committed 206 of 206...
Done. 206 new DVDs written to Firestore.
```

> **Note:** The exact duplicate count will vary depending on how much overlap exists between `dvds-seed.js` and `dvds.csv`.

---

## Re-running safely

Both scripts are safe to re-run:

- `npm run seed` — will create duplicate entries if the same titles are already in Firestore (run it once)
- `npm run seed:csv` — **always safe to re-run**, the dedup logic skips anything already in the database

If you add new rows to `dvds.csv`, just run `npm run seed:csv` again — it will only write the new ones.

---

## Quick reference

| Command | What it does |
|---|---|
| `npm run seed` | Seeds `dvds-seed.js` (rich metadata, ~63 entries) |
| `npm run seed:csv` | Seeds `dvds.csv` with dedup (~270 entries) |
| `npm run dev` | Starts the local dev server |
| `npm run build` | Builds for production |
