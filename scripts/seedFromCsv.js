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

import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createReadStream, readFileSync, existsSync } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }
  const filePath = path.join(__dirname, '..', 'serviceAccount.json')
  if (existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  }
  throw new Error('Missing Firebase credentials: set FIREBASE_SERVICE_ACCOUNT or place serviceAccount.json in the project root')
}

initializeApp({ credential: cert(loadServiceAccount()) })
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

function normalizeTitle(title) {
  // Lowercase, collapse whitespace, strip punctuation for fuzzy-ish matching
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

async function fetchExistingTitles() {
  console.log('Fetching existing titles from Firestore…')
  const snap = await db.collection('dvds').select('title').get()
  const existing = new Set()
  snap.forEach(doc => {
    const t = doc.data().title
    if (t) existing.add(normalizeTitle(t))
  })
  console.log(`  Found ${existing.size} existing DVDs in Firestore.`)
  return existing
}

async function seed() {
  const csvPath = path.join(__dirname, 'dvds.csv')
  console.log(`Reading ${csvPath}…`)
  const rows = await parseCsv(csvPath)
  const dvds = rows.map(normalize).filter(Boolean)
  console.log(`Parsed ${dvds.length} valid DVDs from CSV.`)

  const existing = await fetchExistingTitles()

  const toAdd = []
  const skipped = []

  for (const dvd of dvds) {
    if (existing.has(normalizeTitle(dvd.title))) {
      skipped.push(dvd.title)
    } else {
      toAdd.push(dvd)
    }
  }

  if (skipped.length > 0) {
    console.log(`\nSkipping ${skipped.length} duplicate(s):`)
    skipped.forEach(t => console.log(`  ✗ ${t}`))
  }

  if (toAdd.length === 0) {
    console.log('\nNo new DVDs to add.')
    return
  }

  console.log(`\nAdding ${toAdd.length} new DVD(s)…`)
  let batch = db.batch()
  let count = 0

  for (const dvd of toAdd) {
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
  console.log(`\n✓ Done. ${count} new DVD(s) added. ${skipped.length} duplicate(s) skipped.`)
}

seed().catch(err => { console.error(err); process.exit(1) })
