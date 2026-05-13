/**
 * dedupDVDs.js — Find and optionally remove duplicate DVD entries in Firestore
 *
 * Uses string similarity to find suspiciously close title pairs, then sends
 * them to Claude Haiku to decide if they're truly the same DVD (accounting
 * for typos) vs. genuinely separate entries (different volumes, parts, etc.).
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   # Find duplicates and print a report (no changes made)
 *   node scripts/dedupDVDs.js
 *
 *   # Interactively review and delete confirmed duplicates
 *   node scripts/dedupDVDs.js --delete
 *
 *   # Adjust sensitivity (0–1, default 0.82). Lower = more matches caught.
 *   node scripts/dedupDVDs.js --threshold 0.75
 *
 * ── How it works ──────────────────────────────────────────────────────────────
 *
 *   1. Load all DVD titles from Firestore
 *   2. Compare every pair using normalized Levenshtein similarity
 *   3. Send suspicious pairs (similarity above threshold) to Claude in one batch
 *   4. Claude decides: DUPLICATE (typo/same DVD) vs DIFFERENT (separate volumes etc.)
 *   5. Print a report. With --delete, prompt before removing the duplicate.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'fs'
import * as readline from 'readline/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv     = process.argv.slice(2)
const hasFlag  = f => argv.includes(`--${f}`)
const getArg   = f => { const i = argv.indexOf(`--${f}`); return i !== -1 ? argv[i + 1] : null }

const DELETE_MODE = hasFlag('delete')
const THRESHOLD   = parseFloat(getArg('threshold') || '0.82')

// ── Init ──────────────────────────────────────────────────────────────────────

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  const p = path.join(__dirname, '..', 'serviceAccount.json')
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'))
  throw new Error('Missing Firebase credentials')
}

initializeApp({ credential: cert(loadServiceAccount()) })
const db        = getFirestore()
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── String similarity ─────────────────────────────────────────────────────────

function normalize(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i || j)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function similarity(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1
  const dist = levenshtein(na, nb)
  return 1 - dist / Math.max(na.length, nb.length)
}

// ── Claude dedup ──────────────────────────────────────────────────────────────

async function classifyPairsWithClaude(pairs) {
  if (pairs.length === 0) return []

  const pairList = pairs.map((p, i) =>
    `${i + 1}. Title A: "${p.a.title}" | Title B: "${p.b.title}"`
  ).join('\n')

  const prompt = `You are helping deduplicate a magic DVD library database.

For each pair of DVD titles below, decide if they refer to the SAME DVD (e.g. one is a typo or slight misspelling of the other) or DIFFERENT DVDs (e.g. different volumes, sequels, or genuinely unrelated titles).

Rules:
- DUPLICATE: same DVD, just spelled differently or with minor formatting differences
- DIFFERENT: separate volumes (Vol 1 vs Vol 2), parts, sequels, or clearly distinct titles
- When in doubt, err toward DIFFERENT to avoid accidental deletion

Pairs:
${pairList}

Return ONLY a JSON array with one object per pair in the same order:
[
  { "index": 1, "verdict": "DUPLICATE", "reason": "brief explanation" },
  { "index": 2, "verdict": "DIFFERENT", "reason": "brief explanation" }
]`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw     = response.content[0].text.trim()
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Racherbaumer DVD Deduplicator')
  console.log(`   Threshold: ${THRESHOLD} · Mode: ${DELETE_MODE ? 'delete' : 'report only'}\n`)

  // Load all DVDs
  console.log('Loading DVDs from Firestore…')
  const snap = await db.collection('dvds').get()
  const dvds = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Loaded ${dvds.length} DVDs.\n`)

  if (dvds.length < 2) {
    console.log('Not enough DVDs to compare.')
    return
  }

  // Find suspicious pairs via string similarity
  console.log('Comparing titles…')
  const suspicious = []
  for (let i = 0; i < dvds.length; i++) {
    for (let j = i + 1; j < dvds.length; j++) {
      const sim = similarity(dvds[i].title, dvds[j].title)
      if (sim >= THRESHOLD && sim < 1.0) {
        suspicious.push({ a: dvds[i], b: dvds[j], sim })
      }
    }
  }

  // Also catch exact normalized matches (different punctuation/spacing)
  const exactDupes = []
  for (let i = 0; i < dvds.length; i++) {
    for (let j = i + 1; j < dvds.length; j++) {
      if (normalize(dvds[i].title) === normalize(dvds[j].title)) {
        exactDupes.push({ a: dvds[i], b: dvds[j], sim: 1.0 })
      }
    }
  }

  console.log(`Found ${exactDupes.length} exact match(es) and ${suspicious.length} suspicious pair(s).\n`)

  // Report exact dupes immediately — no need for Claude
  if (exactDupes.length > 0) {
    console.log('── Exact duplicates (same title, different Firestore IDs) ─────────────────')
    exactDupes.forEach(({ a, b }) => {
      console.log(`  "${a.title}"`)
      console.log(`    ID A: ${a.id}`)
      console.log(`    ID B: ${b.id}`)
      console.log()
    })
  }

  // Send suspicious pairs to Claude
  let duplicates = []
  if (suspicious.length > 0) {
    console.log(`Sending ${suspicious.length} pair(s) to Claude for review…`)
    const results = await classifyPairsWithClaude(suspicious)

    duplicates = results
      .filter(r => r.verdict === 'DUPLICATE')
      .map(r => ({ ...suspicious[r.index - 1], reason: r.reason }))

    const different = results.filter(r => r.verdict === 'DIFFERENT')

    if (different.length > 0) {
      console.log('\n── Confirmed DIFFERENT (not duplicates) ──────────────────────────────────')
      different.forEach(r => {
        const pair = suspicious[r.index - 1]
        console.log(`  ✓ "${pair.a.title}" vs "${pair.b.title}"`)
        console.log(`    Reason: ${r.reason}`)
      })
    }

    if (duplicates.length > 0) {
      console.log('\n── Confirmed DUPLICATES ──────────────────────────────────────────────────')
      duplicates.forEach(({ a, b, sim, reason }) => {
        console.log(`  ✗ "${a.title}"`)
        console.log(`    vs "${b.title}"`)
        console.log(`    Similarity: ${(sim * 100).toFixed(1)}% · ${reason}`)
        console.log(`    Keep: ${a.id} | Remove: ${b.id}`)
        console.log()
      })
    } else {
      console.log('\n✓ No duplicates found among suspicious pairs.')
    }
  }

  // Delete mode
  const allToReview = [
    ...exactDupes.map(d => ({ ...d, reason: 'Exact title match' })),
    ...duplicates,
  ]

  if (DELETE_MODE && allToReview.length > 0) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n── Delete mode ───────────────────────────────────────────────────────────')
    console.log('For each duplicate, you choose which ID to DELETE (the other is kept).\n')

    for (const { a, b, reason } of allToReview) {
      console.log(`Duplicate: "${a.title}" vs "${b.title}"`)
      console.log(`  Reason: ${reason}`)
      console.log(`  [A] Keep A, delete B  →  delete ${b.id}`)
      console.log(`  [B] Keep B, delete A  →  delete ${a.id}`)
      console.log(`  [S] Skip this pair`)

      const answer = (await rl.question('  Choice [A/B/S]: ')).trim().toUpperCase()

      if (answer === 'A') {
        await db.collection('dvds').doc(b.id).delete()
        console.log(`  ✓ Deleted "${b.title}" (${b.id})\n`)
      } else if (answer === 'B') {
        await db.collection('dvds').doc(a.id).delete()
        console.log(`  ✓ Deleted "${a.title}" (${a.id})\n`)
      } else {
        console.log('  Skipped.\n')
      }
    }

    rl.close()
    console.log('Done.')
  } else if (allToReview.length > 0) {
    console.log('\nRun with --delete to interactively remove duplicates.')
  } else {
    console.log('\n✓ No duplicates found. Your library looks clean!')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
