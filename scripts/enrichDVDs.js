/**
 * enrichDVDs.js — AI-powered DVD metadata enrichment
 *
 * Reads DVDs from Firestore (or a CSV), searches the web for each title,
 * then uses Claude Haiku to extract metadata and generate a short summary.
 *
 * Output: scripts/enrichment-output.json
 *   → Apply to Firestore with: node scripts/applyEnrichment.js
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *
 *   1. Install dependencies (if not already):
 *        npm install @anthropic-ai/sdk firebase-admin
 *
 *   2. Get a Serper API key (free tier = 2,500 searches):
 *        https://serper.dev  →  Dashboard → API Key
 *
 *   3. Get a Claude API key:
 *        https://console.anthropic.com  →  API Keys
 *
 *   4. Export env vars:
 *        export ANTHROPIC_API_KEY="sk-ant-..."
 *        export SERPER_API_KEY="your-serper-key"
 *        export FIREBASE_SERVICE_ACCOUNT=$(cat ~/path/to/serviceAccount.json)
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   # Enrich all DVDs from Firestore
 *   node scripts/enrichDVDs.js
 *
 *   # Only process the first 10 (good for testing cost/quality)
 *   node scripts/enrichDVDs.js --limit 10
 *
 *   # Skip the first 20 (resume after a partial run)
 *   node scripts/enrichDVDs.js --skip 20
 *
 *   # Dry run — lists DVDs but makes no API calls
 *   node scripts/enrichDVDs.js --dry-run
 *
 *   # Use a CSV file instead of Firestore
 *   node scripts/enrichDVDs.js --source csv --file scripts/dvds.csv
 *
 * ── Cost estimate ─────────────────────────────────────────────────────────────
 *
 *   For ~178 DVDs:
 *     Serper:       ~350 searches  ≈  $0.35
 *     Claude Haiku: ~178 calls     ≈  $0.15  (claude-haiku-4-5)
 *     Total:                       ≈  $0.50
 *
 * ── Resume support ───────────────────────────────────────────────────────────
 *
 *   The script saves enrichment-output.json after every DVD and skips any
 *   title already present in that file. Safe to interrupt and re-run.
 */

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync, writeFileSync, existsSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Parse CLI args ────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const getArg = name => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 ? argv[i + 1] : null
}
const hasFlag = name => argv.includes(`--${name}`)

const SOURCE  = getArg('source') || 'firestore'
const CSV_FILE = getArg('file') || path.join(__dirname, 'dvds.csv')
const LIMIT   = parseInt(getArg('limit') || '0')
const SKIP    = parseInt(getArg('skip')  || '0')
const DRY_RUN = hasFlag('dry-run')
const OUTPUT  = path.join(__dirname, 'enrichment-output.json')

// ── Validate env ──────────────────────────────────────────────────────────────

if (!DRY_RUN) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY')
  if (!process.env.SERPER_API_KEY)    throw new Error('Missing SERPER_API_KEY')
}

// ── Initialize APIs ───────────────────────────────────────────────────────────

const anthropic  = DRY_RUN ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SERPER_KEY = process.env.SERPER_API_KEY

// ── Load DVDs ─────────────────────────────────────────────────────────────────

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

async function loadFromFirestore() {
  const serviceAccount = loadServiceAccount()
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()
  const snap = await db.collection('dvds').orderBy('title').get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function loadFromCsv(filePath) {
  const rows = []
  const rl = createInterface({ input: createReadStream(filePath) })
  let headers = null
  for await (const line of rl) {
    const cells = parseCsvLine(line)
    if (!headers) { headers = cells.map(h => h.trim()); continue }
    const row = {}
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim() })
    const title = row['DVD Title'] || row['Name'] || row['title'] || ''
    if (title) rows.push({ title, magician: row['Magician'] || row['magician'] || '' })
  }
  return rows
}

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result
}

// ── Serper search ─────────────────────────────────────────────────────────────

async function serperSearch(q) {
  const res = await fetch('https://google.serper.dev/search', {
    method:  'POST',
    headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ q, num: 5 }),
  })
  if (!res.ok) throw new Error(`Serper error ${res.status}: ${await res.text()}`)
  return res.json()
}

function extractSnippets(data) {
  if (!data?.organic) return []
  return data.organic.map(r => ({
    title:   r.title   || '',
    url:     r.link    || '',
    snippet: r.snippet || '',
  }))
}

function compileContext(title, results) {
  const items = results
    .filter(r => r.title || r.snippet)
    .map(r => `Title:   ${r.title}\nURL:     ${r.url}\nSnippet: ${r.snippet}`)
  return items.slice(0, 8).join('\n\n---\n\n') || '(no results found)'
}

// ── Claude enrichment ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a librarian assistant enriching a magic DVD database.
Given a DVD title and web search results, extract metadata accurately.
Only use information clearly supported by the search results.
Never invent data. Leave fields empty when information is not found.`

async function enrichWithClaude(dvd, context) {
  const magicianHint = (() => {
    if (Array.isArray(dvd.magician)) return dvd.magician.join(', ')
    return dvd.magician || ''
  })()

  const prompt = `DVD Title: "${dvd.title}"
${magicianHint ? `Known magician(s) in our database: ${magicianHint}` : ''}

Web search results:
${context}

Return ONLY valid JSON (no markdown fences, no extra text) with exactly this structure:
{
  "magician": ["performer name 1", "performer name 2"],
  "producer": "production company name, or empty string",
  "year": "4-digit year like 2005, or empty string",
  "vanishingIncUrl": "full https:// URL to Vanishing Inc product page, or empty string",
  "penguinUrl": "full https:// URL to Penguin Magic product page, or empty string",
  "conjuringArchiveUrl": "full https:// URL to Conjuring Archive page, or empty string",
  "aiSummary": "50-200 words describing what this DVD teaches, the style of magic, notable routines, and who it would appeal to — written for magicians browsing a lending library. Empty string if insufficient info found."
}

Rules:
- magician array: include all featured performers found; keep existing ones if not contradicted
- URLs: only include if they clearly point to this specific DVD/product
- aiSummary: write for magicians, mention specific tricks/techniques if found, note skill level if apparent
- year: 4-digit string or empty; do not guess`

  const response = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0].text.trim()

  // Strip markdown code fences if model added them despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    console.error(`    ⚠ JSON parse failed for "${dvd.title}". Raw response:\n${raw}`)
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎩 Racherbaumer DVD Enricher`)
  console.log(`   Source:  ${SOURCE}`)
  console.log(`   Dry run: ${DRY_RUN}`)
  if (LIMIT) console.log(`   Limit:   ${LIMIT}`)
  if (SKIP)  console.log(`   Skip:    ${SKIP}`)
  console.log()

  // Load DVDs
  console.log(`Loading DVDs from ${SOURCE}…`)
  let dvds = SOURCE === 'csv'
    ? await loadFromCsv(CSV_FILE)
    : await loadFromFirestore()

  if (SKIP > 0) dvds = dvds.slice(SKIP)
  if (LIMIT > 0) dvds = dvds.slice(0, LIMIT)

  console.log(`Found ${dvds.length} DVDs to process.\n`)

  // Load existing output (for resume support)
  let output = {}
  if (existsSync(OUTPUT)) {
    try {
      output = JSON.parse(readFileSync(OUTPUT, 'utf-8'))
      const existing = Object.keys(output).length
      if (existing > 0) console.log(`Resuming — ${existing} already enriched, skipping those.\n`)
    } catch { /* ignore corrupt file */ }
  }

  let processed = 0
  let skipped   = 0
  let errors    = 0

  for (let i = 0; i < dvds.length; i++) {
    const dvd  = dvds[i]
    const key  = dvd.id || dvd.title   // Firestore ID preferred, fall back to title
    const label = `[${i + 1 + SKIP}/${dvds.length + SKIP}]`

    // Skip if already done
    if (output[key]) {
      console.log(`${label} ⏭  Skipping (already enriched): "${dvd.title}"`)
      skipped++
      continue
    }

    console.log(`${label} 🔍 "${dvd.title}"`)

    if (DRY_RUN) {
      console.log(`       (dry run — skipping API calls)`)
      continue
    }

    try {
      // Build magician string for search queries
      const magicianStr = (() => {
        if (Array.isArray(dvd.magician) && dvd.magician.length > 0) return dvd.magician[0]
        if (typeof dvd.magician === 'string' && dvd.magician.trim()) return dvd.magician.trim()
        return ''
      })()
      const titleQuery    = magicianStr
        ? `"${dvd.title}" ${magicianStr} magic dvd`
        : `"${dvd.title}" magic dvd`
      const siteQuery     = magicianStr
        ? `"${dvd.title}" ${magicianStr} magic dvd (site:penguinmagic.com OR site:vanishingmagicinc.com OR site:conjuringarchive.com)`
        : `"${dvd.title}" magic dvd (site:penguinmagic.com OR site:vanishingmagicinc.com OR site:conjuringarchive.com)`

      // Two searches: general + site-specific
      const [generalData, siteData] = await Promise.all([
        serperSearch(titleQuery),
        serperSearch(siteQuery),
      ])

      const allResults = [
        ...extractSnippets(generalData),
        ...extractSnippets(siteData),
      ]

      const context = compileContext(dvd.title, allResults)

      // Enrich with Claude
      const enriched = await enrichWithClaude(dvd, context)

      if (enriched) {
        const entry = {
          firestoreId:         dvd.id   || null,
          title:               dvd.title,
          magician:            enriched.magician            || [],
          producer:            enriched.producer            || '',
          year:                enriched.year                || '',
          vanishingIncUrl:     enriched.vanishingIncUrl     || '',
          penguinUrl:          enriched.penguinUrl          || '',
          conjuringArchiveUrl: enriched.conjuringArchiveUrl || '',
          aiSummary:           enriched.aiSummary           || '',
          enrichedAt:          new Date().toISOString(),
        }

        output[key] = entry

        const found = [
          enriched.producer       && `producer`,
          enriched.year           && `year=${enriched.year}`,
          enriched.vanishingIncUrl && `vanishing`,
          enriched.penguinUrl      && `penguin`,
          enriched.conjuringArchiveUrl && `conjuring`,
          enriched.aiSummary       && `summary(${enriched.aiSummary.split(' ').length}w)`,
        ].filter(Boolean)

        console.log(`       ✓ ${found.length > 0 ? found.join(', ') : 'no data found'}`)
        processed++
      } else {
        console.log(`       ✗ Failed to parse Claude response`)
        errors++
      }

      // Save after every DVD (supports interrupt + resume)
      writeFileSync(OUTPUT, JSON.stringify(output, null, 2))

      // Polite rate limit: ~1 DVD/second
      await sleep(1000)

    } catch (err) {
      console.error(`       ✗ Error: ${err.message}`)
      errors++
      await sleep(2000) // back off longer on error
    }
  }

  console.log(`
────────────────────────────────────────
✅  Done!
    Processed: ${processed}
    Skipped:   ${skipped}
    Errors:    ${errors}
    Output:    ${OUTPUT}

Next step:
    node scripts/applyEnrichment.js
────────────────────────────────────────`)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(err => { console.error(err); process.exit(1) })
