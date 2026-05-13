/**
 * CSV seed script — reads scripts/dvds.csv exported from Google Sheets
 * and loads all DVDs into Firestore.
 *
 * Setup:
 *   1. In Google Sheets → File → Download → CSV (.csv)
 *      Save as:  scripts/dvds.csv
 *
 *   Expected column headers (from "Master List Order" tab):
 *     DVD Title, Magician, Box Number, Checked Out
 *
 *   Or from the richer tabs (OG_LIST / Additions to OG_LIST):
 *     Name, Magician, Notes, Magic Type, Producer, Other Features
 *
 *   2. Install admin sdk:  npm install firebase-admin
 *   3. Set env var:        export FIREBASE_SERVICE_ACCOUNT='<json>'
 *   4. Run:                node scripts/seedFromCsv.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  (() => { throw new Error('Set FIREBASE_SERVICE_ACCOUNT env var') })()
)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function parseCsv(filePath) {
  const rows = []
  const rl = createInterface({ input: createReadStream(filePath) })
  let headers = null

  for await (const line of rl) {
    const cells = parseCsvLine(line)
    if (!headers) { headers = cells.map(h => h.trim()); continue }
    const row = {}
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim() })
    rows.push(row)
  }
  return rows
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

function normalize(row) {
  // Handle both column naming conventions from the two sheet tabs
  const title    = row['DVD Title'] || row['Name'] || ''
  const magician = row['Magician'] || ''
  const notes    = row['Notes'] || ''
  const magicType = row['Magic Type'] || ''
  const producer  = row['Producer'] || ''
  const otherFeatures = row['Other Features'] || ''

  if (!title) return null

  return {
    title,
    magician:      splitSemi(magician),
    notes,
    magicType:     splitSemi(magicType),
    producer,
    otherFeatures: splitSemi(otherFeatures),
    checkedOutBy:       null,
    checkedOutByName:   null,
    checkedOutAt:       null,
    aiSummary:          '',
    vanishingIncUrl:    '',
    penguinUrl:         '',
    conjuringArchiveUrl:'',
    createdAt:          new Date(),
  }
}

function splitSemi(val) {
  return val.split(';').map(s => s.trim()).filter(Boolean)
}

async function seed() {
  const csvPath = path.join(__dirname, 'dvds.csv')
  console.log(`Reading ${csvPath}…`)
  const rows = await parseCsv(csvPath)
  const dvds = rows.map(normalize).filter(Boolean)
  console.log(`Parsed ${dvds.length} valid DVDs.`)

  let batch = db.batch()
  let count = 0

  for (const dvd of dvds) {
    const ref = db.collection('dvds').doc()
    batch.set(ref, dvd)
    count++
    if (count % 499 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`  committed ${count}…`)
    }
  }
  await batch.commit()
  console.log(`✓ Done. ${count} DVDs written to Firestore.`)
}

seed().catch(err => { console.error(err); process.exit(1) })
