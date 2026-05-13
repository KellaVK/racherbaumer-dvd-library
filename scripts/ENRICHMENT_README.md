# DVD Enrichment Pipeline

Automatically fills in missing DVD metadata (producer, year, performer list, vendor links) and generates short AI summaries using Claude Haiku and the Serper web search API.

---

## How it works

For each DVD in the database, the pipeline:

1. **Searches the web** (via Serper) for the DVD title on general results and specifically on Penguin Magic, Vanishing Inc, and Conjuring Archive
2. **Passes search snippets to Claude Haiku**, which extracts: magician(s), producer, year, product page URLs, and writes a 50–200 word library summary
3. **Saves results** to `scripts/enrichment-output.json` after every DVD (safe to interrupt and resume)
4. A separate **apply step** batch-updates Firestore with only non-empty fields

---

## One-time setup

### 1. Install dependencies

```bash
npm install @anthropic-ai/sdk firebase-admin
```

### 2. Get API keys

**Serper** (web search — free tier = 2,500 searches):
- Sign up at [serper.dev](https://serper.dev)
- Copy your API key from the dashboard

**Claude** (AI summaries):
- Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key

**Firebase service account** (to read/write Firestore):
- Firebase Console → Project Settings → Service Accounts → Generate new key
- Download the JSON file

### 3. Export environment variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export SERPER_API_KEY="your-serper-key"
export FIREBASE_SERVICE_ACCOUNT=$(cat ~/Downloads/racherbaumer-dvd-collection-firebase-adminsdk-*.json)
```

---

## Running the enrichment

### Step 1: Test with a small batch first

```bash
# Dry run — lists DVDs but makes zero API calls
node scripts/enrichDVDs.js --dry-run

# Process just the first 5 DVDs to check quality and cost
node scripts/enrichDVDs.js --limit 5
```

Review `scripts/enrichment-output.json` and check that summaries look good.

### Step 2: Run the full enrichment

```bash
node scripts/enrichDVDs.js
```

The script prints progress like:
```
[1/178] 🔍 "Optical Delusion"
         ✓ producer, year=2003, penguin, summary(87w)
[2/178] 🔍 "Restaurant Magic - Vol.1"
         ✓ summary(62w)
[3/178] 🔍 "Three Ring Concerto"
         — no data found
```

**Resume support:** if you interrupt the script (Ctrl+C), just re-run it — already-processed DVDs are skipped automatically.

**Skip N entries:** if you want to resume from a specific point:
```bash
node scripts/enrichDVDs.js --skip 50
```

### Step 3: Preview what will be written

```bash
export FIREBASE_SERVICE_ACCOUNT=$(cat ~/Downloads/racherbaumer-dvd-collection-firebase-adminsdk-*.json)
node scripts/applyEnrichment.js --dry-run
```

### Step 4: Apply to Firestore

```bash
node scripts/applyEnrichment.js
```

---

## Advanced options

### enrichDVDs.js options

| Flag | Description |
|------|-------------|
| `--limit N` | Only process N DVDs |
| `--skip N` | Skip the first N DVDs |
| `--dry-run` | List DVDs without making any API calls |
| `--source csv` | Read from a CSV file instead of Firestore |
| `--file path/to/file.csv` | CSV file path (default: `scripts/dvds.csv`) |

### applyEnrichment.js options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without writing to Firestore |
| `--fields f1,f2` | Only write specific fields (e.g. `--fields aiSummary,vanishingIncUrl`) |
| `--skip-if-has field` | Skip DVDs that already have a value for `field` |

### Re-run summaries only

If you want to regenerate just the AI summaries (e.g. with a better prompt) without re-searching the web, you can edit `enrichment-output.json` to clear the `aiSummary` fields and re-run enrichDVDs with `--skip-if-has aiSummary` on the apply side. Or delete the output file entirely to start fresh.

---

## Cost estimate

For ~178 DVDs:

| Service | Usage | Cost |
|---------|-------|------|
| Serper | ~360 searches (2 per DVD) | ~$0.36 |
| Claude Haiku | ~178 API calls | ~$0.10–0.20 |
| **Total** | | **~$0.50–0.60** |

Serper's free tier covers 2,500 searches, so the entire collection can be enriched for free on the first run.

---

## Output format

`enrichment-output.json` is a key→object map where keys are Firestore document IDs (or DVD titles if loaded from CSV):

```json
{
  "abc123firestore": {
    "firestoreId": "abc123firestore",
    "title": "Optical Delusion",
    "magician": ["Aaron Paterson"],
    "producer": "L&L Publishing",
    "year": "2003",
    "vanishingIncUrl": "",
    "penguinUrl": "https://www.penguinmagic.com/p/...",
    "conjuringArchiveUrl": "",
    "aiSummary": "Aaron Paterson presents a masterclass in visual magic...",
    "enrichedAt": "2026-05-12T18:30:00.000Z"
  }
}
```

You can edit this file by hand before applying — useful for correcting any AI mistakes before they go into Firestore.

---

## Firestore fields written

| Field | Type | Description |
|-------|------|-------------|
| `magician` | string[] | Featured performers |
| `producer` | string | Production company |
| `year` | string | Release year (4-digit) |
| `vanishingIncUrl` | string | Vanishing Inc product page URL |
| `penguinUrl` | string | Penguin Magic product page URL |
| `conjuringArchiveUrl` | string | Conjuring Archive page URL |
| `aiSummary` | string | 50–200 word library description |
| `enrichedAt` | string | ISO timestamp of enrichment run |

Only non-empty values are written. Existing Firestore data is never overwritten with blank strings.

---

## Adding DVDs in batches

The recommended workflow when adding new DVDs from a spreadsheet export:

1. **Export only new rows** from Google Sheets as CSV, or export the full sheet — `seedFromCsv.js` checks for duplicates by title before writing, so it's safe to re-run with the full list.
2. **Seed into Firestore:** `node scripts/seedFromCsv.js`
3. **Run dedup** (see below) to catch any near-miss titles before enriching
4. **Enrich:** `node scripts/enrichDVDs.js --source firestore`
5. **Apply:** `node scripts/applyEnrichment.js`

---

## Deduplication

`dedupDVDs.js` finds DVD entries that are suspiciously similar to each other — usually typos or slight title variations that slipped in across different import batches. It uses string similarity to flag candidates, then asks Claude Haiku to decide whether each pair is a true duplicate (same DVD, different spelling) or genuinely separate entries (different volumes, sequels, etc.).

### When to run it

Run it after seeding a new batch of DVDs, before enriching:

```bash
node scripts/dedupDVDs.js
```

### Report mode (default — no changes made)

```bash
node scripts/dedupDVDs.js
```

Prints a report like:

```
── Exact duplicates (same title, different Firestore IDs) ──────────────────
  "Card College Vol. 1"
    ID A: abc123
    ID B: xyz789

── Confirmed DUPLICATES ────────────────────────────────────────────────────
  ✗ "Optical Dellusions"
    vs "Optical Delusions"
    Similarity: 94.4% · One is a misspelling of the other
    Keep: abc123 | Remove: xyz789

── Confirmed DIFFERENT (not duplicates) ────────────────────────────────────
  ✓ "Ambitious Card Vol 1" vs "Ambitious Card Vol 2"
    Reason: Different volumes of the same series
```

### Delete mode (interactive)

```bash
node scripts/dedupDVDs.js --delete
```

Steps through each confirmed duplicate and asks which to keep:

```
Duplicate: "Optical Dellusions" vs "Optical Delusions"
  [A] Keep A, delete B  →  delete xyz789
  [B] Keep B, delete A  →  delete abc123
  [S] Skip this pair
  Choice [A/B/S]:
```

Nothing is deleted until you explicitly choose A or B. Pressing S skips that pair.

### Sensitivity

The default threshold is `0.82` (catches typos and minor differences). You can adjust it:

```bash
# More aggressive — catches more variations
node scripts/dedupDVDs.js --threshold 0.75

# Stricter — only very close matches
node scripts/dedupDVDs.js --threshold 0.90
```

Lower threshold = more pairs flagged. Claude still makes the final call on whether each pair is actually a duplicate, so lowering the threshold just means more pairs go to Claude for review.

### dedupDVDs.js options

| Flag | Description |
|------|-------------|
| `--delete` | Interactive mode — prompts to delete one from each duplicate pair |
| `--threshold N` | Similarity cutoff (0–1, default `0.82`) |

### What it will NOT flag as duplicates

Claude is explicitly instructed to call these DIFFERENT:
- Different volumes: "Card College Vol. 1" vs "Card College Vol. 2"
- Different parts: "Trilogy Part 1" vs "Trilogy Part 2"
- Sequels or follow-ups with different numbering
- Titles that happen to be short and similar but are clearly unrelated

---

## Tips

- **Check quality on a small batch first** — run with `--limit 10` and review the output JSON before processing all 178 DVDs.
- **Some titles won't be found** — niche or out-of-print DVDs may return no useful results. The script will note "no data found" and leave those fields blank.
- **Summaries can be re-generated** — if the summary quality isn't right, you can clear `aiSummary` in the JSON and re-run, or edit them by hand.
- **The apply step is safe to re-run** — it uses Firestore's `update()` (not `set()`), so it only touches the enriched fields and leaves everything else intact.
