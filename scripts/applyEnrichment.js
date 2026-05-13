/**
 * applyEnrichment.js — Apply enrichment-output.json to Firestore
 *
 * Reads the JSON produced by enrichDVDs.js and batch-updates each DVD
 * document in Firestore with the enriched fields. Only fields with
 * non-empty values are written, so existing data is never overwritten
 * with blanks.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   export FIREBASE_SERVICE_ACCOUNT=$(cat ~/path/to/serviceAccount.json)
 *
 *   # Preview what would change (no writes)
 *   node scripts/applyEnrichment.js --dry-run
 *
 *   # Apply all enrichments
 *   node scripts/applyEnrichment.js
 *
 *   # Apply only a specific field (e.g. after re-running summaries only)
 *   node scripts/applyEnrichment.js --fields aiSummary,vanishingIncUrl
 *
 *   # Skip entries that already have an aiSummary in Firestore
 *   node scripts/applyEnrichment.js --skip-if-has aiSummary
 *
 * ── What it writes ────────────────────────────────────────────────────────────
 *
 *   Field                 Written when…
 *   ────────────────────  ──────────────────────────────────
 *   magician              array has at least one entry
 *   producer              non-empty string
 *   year                  non-empty string
 *   vanishingIncUrl       non-empty string
 *   penguinUrl            non-empty string
 *   conjuringArchiveUrl   non-empty string
 *   aiSummary             non-empty string
 *   enrichedAt            always (ISO timestamp of when enrichment ran)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore }        from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv   = process.argv.slice(2)
const getArg = name => { const i = argv.indexOf(`--${name}`); return i !== -1 ? argv[i + 1] : null }
const hasFlag = name => argv.includes(`--${name}`)

const DRY_RUN     = hasFlag('dry-run')
const FIELDS_ONLY = getArg('fields')?.split(',').map(f => f.trim()) || null
const SKIP_IF_HAS = getArg('skip-if-has')
const INPUT       = path.join(__dirname, 'enrichment-output.json')

// All fields the script can write
const ALL_FIELDS = [
  'magician', 'producer', 'year',
  'vanishingIncUrl', 'penguinUrl', 'conjuringArchiveUrl',
  'aiSummary',
]

const ACTIVE_FIELDS = FIELDS_ONLY
  ? ALL_FIELDS.filter(f => FIELDS_ONLY.includes(f))
  : ALL_FIELDS

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎩 Racherbaumer Enrichment Applicator`)
  console.log(`   Dry run:      ${DRY_RUN}`)
  console.log(`   Active fields: ${ACTIVE_FIELDS.join(', ')}`)
  if (SKIP_IF_HAS) console.log(`   Skip if has:  ${SKIP_IF_HAS}`)
  console.log()

  // Load enrichment output
  if (!existsSync(INPUT)) {
    console.error(`Error: ${INPUT} not found.\nRun enrichDVDs.js first.`)
    process.exit(1)
  }
  const enrichments = JSON.parse(readFileSync(INPUT, 'utf-8'))
  const entries = Object.values(enrichments)
  console.log(`Loaded ${entries.length} enriched entries.\n`)

  // Connect to Firestore
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT')
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  let batch       = db.batch()
  let batchCount  = 0
  let totalWrites = 0
  let notFound    = 0
  let skipped     = 0

  for (const entry of entries) {
    // Resolve Firestore doc ref
    let ref

    if (entry.firestoreId) {
      ref = db.collection('dvds').doc(entry.firestoreId)
    } else {
      // Fall back to title lookup
      const snap = await db.collection('dvds')
        .where('title', '==', entry.title)
        .limit(1)
        .get()
      if (snap.empty) {
        console.log(`  ✗ Not found in Firestore: "${entry.title}"`)
        notFound++
        continue
      }
      ref = snap.docs[0].ref
    }

    // Optionally skip if field already populated in Firestore
    if (SKIP_IF_HAS) {
      const existing = (await ref.get()).data()
      if (existing?.[SKIP_IF_HAS]) {
        console.log(`  ⏭  Skipping (already has ${SKIP_IF_HAS}): "${entry.title}"`)
        skipped++
        continue
      }
    }

    // Build update payload — only non-empty values
    const update = {}

    for (const field of ACTIVE_FIELDS) {
      const val = entry[field]
      if (field === 'magician') {
        if (Array.isArray(val) && val.length > 0) update.magician = val
      } else {
        if (val && typeof val === 'string' && val.trim()) update[field] = val.trim()
      }
    }

    update.enrichedAt = entry.enrichedAt || new Date().toISOString()

    if (Object.keys(update).length <= 1) {
      // Only enrichedAt would be written — skip
      console.log(`  — No data to write for "${entry.title}"`)
      continue
    }

    const writtenFields = Object.keys(update).filter(k => k !== 'enrichedAt')
    console.log(`  ${DRY_RUN ? '(dry)' : '✓'} "${entry.title}" → ${writtenFields.join(', ')}`)

    if (!DRY_RUN) {
      batch.update(ref, update)
      batchCount++
      totalWrites++

      // Firestore batch limit is 500 writes
      if (batchCount >= 499) {
        await batch.commit()
        batch = db.batch()
        batchCount = 0
        console.log(`  [batch committed]`)
      }
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit()
  }

  console.log(`
────────────────────────────────────────
${DRY_RUN ? '🔍 Dry run complete (nothing written)' : '✅ Done!'}
    Written:   ${DRY_RUN ? 'n/a (dry run)' : totalWrites}
    Not found: ${notFound}
    Skipped:   ${skipped}
────────────────────────────────────────`)
}

main().catch(err => { console.error(err); process.exit(1) })
