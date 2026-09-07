/**
 * Seed script — imports DVDs into Firestore from dvds-seed.js
 *
 * Usage:
 *   1. Fill in your Firebase credentials in src/firebase/config.js
 *   2. Run:  node scripts/seedFirestore.js
 *
 * This script uses the Firebase Admin SDK (installed automatically with
 * `npm install firebase-admin` the first time you run it).
 *
 * ALTERNATIVE: export the Google Sheet "Master List Order" tab as CSV,
 * save it to scripts/dvds.csv, then use the CSV path below.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { dvdData } from './dvds-seed.js'

// ─── CONFIGURE ───────────────────────────────────────────────────────────────
// Option A: Use a service account key JSON downloaded from Firebase Console
//   → Firebase Console → Project Settings → Service Accounts → Generate new key
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  (() => { throw new Error('Set FIREBASE_SERVICE_ACCOUNT env var to your service account JSON string') })()
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`Seeding ${dvdData.length} DVDs…`)
  let batch = db.batch()
  let count = 0
  let batchCount = 0

  for (const dvd of dvdData) {
    const ref = db.collection('dvds').doc()
    batch.set(ref, {
      title:         dvd.title || '',
      magician:      parseSemicolon(dvd.magician),
      notes:         dvd.notes || '',
      magicType:     parseSemicolon(dvd.magicType),
      producer:      dvd.producer || '',
      otherFeatures: parseSemicolon(dvd.otherFeatures),
      checkedOutBy:       null,
      checkedOutByName:   null,
      checkedOutAt:       null,
      aiSummary:          '',
      vanishingIncUrl:    '',
      penguinUrl:         '',
      conjuringArchiveUrl:'',
      createdAt:          new Date(),
    })
    count++
    batchCount++
    // Firestore batches max at 500 writes — commit and start a fresh batch
    if (batchCount === 499) {
      await batch.commit()
      console.log(`  committed ${count}…`)
      batch = db.batch()   // ← start a new batch
      batchCount = 0
    }
  }

  // Commit any remaining writes
  if (batchCount > 0) {
    await batch.commit()
  }
  console.log(`✓ Done. ${count} DVDs written to Firestore.`)
}

function parseSemicolon(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return val.split(';').map(s => s.trim()).filter(Boolean)
}

seed()
  .then(() => process.exit(0))          // ← must exit or Node hangs on Firebase gRPC connections
  .catch(err => { console.error(err); process.exit(1) })
