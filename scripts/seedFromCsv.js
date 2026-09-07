/**
 * seedFromCsv.js — imports DVDs from scripts/dvds.csv into Firestore
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT='<json>' node scripts/seedFromCsv.js
 *
 * Features:
 *   - Reads scripts/dvds.csv (columns: NAME, Magician)
 *   - Fetches all existing Firestore titles and skips duplicates
 *   - Writes in safe batches of 499 (Firestore hard-limit is 500)
 *   - Exits cleanly when done (no gRPC hang)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// ─── CONFIGURE ───────────────────────────────────────────────────────────────
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  (() => { throw new Error('Set FIREBASE_SERVICE_ACCOUNT env var to your service account JSON string') })()
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Minimal CSV parser — handles quoted fields (e.g. "foo, bar") and
 * escaped double-quotes inside quoted fields (e.g. ""trick"").
 */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows = []

  for (const line of lines) {
    if (!line.trim()) continue
    const fields = []
    let i = 0
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let field = ''
        i++ // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            field += '"'
            i += 2
          } else if (line[i] === '"') {
            i++ // skip closing quote
            break
          } else {
            field += line[i++]
          }
        }
        fields.push(field)
        if (line[i] === ',') i++ // skip comma after quoted field
      } else {
        // Unquoted field
        const end = line.indexOf(',', i)
        if (end === -1) {
          fields.push(line.slice(i).trim())
          break
        } else {
          fields.push(line.slice(i, end).trim())
          i = end + 1
        }
      }
    }
    rows.push(fields)
  }
  return rows
}

/** Normalize a title for dedup comparison (lowercase, collapse whitespace) */
function normalizeTitle(title) {
  return (title || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Split a semicolon-separated string into a trimmed array */
function parseSemicolon(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return val.split(';').map(s => s.trim()).filter(Boolean)
}

async function seed() {
  // 1. Parse CSV
  const csvPath = join(__dirname, 'dvds.csv')
  const raw = readFileSync(csvPath, 'utf8')
  const rows = parseCsv(raw)

  if (rows.length < 2) {
    console.log('CSV is empty or header-only. Nothing to do.')
    return
  }

  const [header, ...dataRows] = rows
  const nameIdx     = header.findIndex(h => h.trim().toUpperCase() === 'NAME')
  const magicianIdx = header.findIndex(h => h.trim().toLowerCase() === 'magician')

  if (nameIdx === -1) throw new Error('CSV missing NAME column')

  console.log(`CSV loaded: ${dataRows.length} rows`)

  // 2. Fetch existing titles from Firestore for dedup
  console.log('Fetching existing Firestore titles for dedup...')
  const snapshot = await db.collection('dvds').select('title').get()
  const existingTitles = new Set(
    snapshot.docs.map(d => normalizeTitle(d.data().title))
  )
  console.log(`  ${existingTitles.size} existing docs found`)

  // 3. Filter to new-only entries
  const newEntries = dataRows
    .map(row => ({
      title:    (row[nameIdx]     || '').trim(),
      magician: (magicianIdx >= 0 ? row[magicianIdx] : '') || '',
    }))
    .filter(entry => entry.title !== '')
    .filter(entry => !existingTitles.has(normalizeTitle(entry.title)))

  console.log(`  ${newEntries.length} new entries to write (${dataRows.length - newEntries.length} skipped as duplicates)`)

  if (newEntries.length === 0) {
    console.log('Nothing new to seed.')
    return
  }

  // 4. Write in batches of 499
  let batch = db.batch()
  let batchCount = 0
  let totalWritten = 0

  for (const entry of newEntries) {
    const ref = db.collection('dvds').doc()
    batch.set(ref, {
      title:              entry.title,
      magician:           parseSemicolon(entry.magician),
      notes:              '',
      magicType:          [],
      producer:           '',
      otherFeatures:      [],
      checkedOutBy:       null,
      checkedOutByName:   null,
      checkedOutAt:       null,
      aiSummary:          '',
      vanishingIncUrl:    '',
      penguinUrl:         '',
      conjuringArchiveUrl:'',
      createdAt:          new Date(),
    })
    batchCount++
    totalWritten++

    if (batchCount === 499) {
      await batch.commit()
      console.log(`  committed ${totalWritten} of ${newEntries.length}...`)
      batch = db.batch()
      batchCount = 0
    }
  }

  // Commit any remaining writes
  if (batchCount > 0) {
    await batch.commit()
    console.log(`  committed ${totalWritten} of ${newEntries.length}...`)
  }

  console.log(`Done. ${totalWritten} new DVDs written to Firestore.`)
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1) })
