const PLACEHOLDERS = new Set(['', '?', 'n/a', 'na', 'none', 'null', 'unknown', 'not listed'])
const LIST_SPLITTER = /[;,/|]+/

export function isPlaceholder(value) {
  if (value == null) return true
  const normalized = String(value).trim().toLowerCase()
  return PLACEHOLDERS.has(normalized) || !/[a-z0-9]/i.test(normalized)
}

export function normalizeList(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(LIST_SPLITTER)
  const seen = new Set()

  return values.flatMap(item => String(item ?? '').split(LIST_SPLITTER))
    .map(item => item.trim())
    .filter(item => !isPlaceholder(item))
    .filter(item => {
      const key = item.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function displayValue(value, fallback = 'Not listed') {
  const items = normalizeList(value)
  return items.length ? items.join(', ') : fallback
}

export function normalizeDVD(raw = {}) {
  const aiSummary = isPlaceholder(raw.aiSummary) ? '' : String(raw.aiSummary).trim()
  return {
    ...raw,
    title: isPlaceholder(raw.title) ? 'Untitled DVD' : String(raw.title).trim(),
    magician: normalizeList(raw.magician),
    magicType: normalizeList(raw.magicType),
    otherFeatures: normalizeList(raw.otherFeatures),
    featured: raw.featured === true,
    aiSummary,
    aiSummaryStatus: raw.aiSummaryStatus || (aiSummary ? 'complete' : 'not_requested'),
  }
}

export function normalizeTitle(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\b(volume|vol\.?|disc|disk|dvd)\b/g, ' vol ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function levenshtein(a, b) {
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[b.length]
}

export function titleSimilarity(a, b) {
  const first = normalizeTitle(a)
  const second = normalizeTitle(b)
  const longest = Math.max(first.length, second.length)
  return longest ? 1 - (levenshtein(first, second) / longest) : 1
}

function isHttpsUrl(value) {
  if (!String(value ?? '').trim()) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function validateDVDForm(form = {}) {
  const errors = {}
  if (isPlaceholder(form.title)) errors.title = 'Enter a title.'

  const year = String(form.year ?? '').trim()
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1888 || Number(year) > new Date().getFullYear() + 2)) {
    errors.year = 'Enter a four-digit release year.'
  }

  for (const field of ['penguinUrl', 'vanishingIncUrl', 'conjuringArchiveUrl']) {
    if (!isHttpsUrl(form[field])) errors[field] = 'Use a complete HTTPS link.'
  }
  return errors
}

function includesValue(list, requested) {
  if (!requested || requested === 'all') return true
  return normalizeList(list).some(item => item.toLocaleLowerCase() === requested.toLocaleLowerCase())
}

export function filterDVDs(dvds, state = {}) {
  const query = String(state.query ?? '').trim().toLocaleLowerCase()
  const output = dvds.filter(raw => {
    const dvd = normalizeDVD(raw)
    if (query && ![
      dvd.title,
      dvd.magician.join(' '),
      dvd.magicType.join(' '),
      dvd.producer,
      dvd.notes,
      dvd.aiSummary,
    ].join(' ').toLocaleLowerCase().includes(query)) return false
    if (state.availability === 'available' && dvd.checkedOutBy) return false
    if ((state.availability === 'out' || state.availability === 'checked-out') && !dvd.checkedOutBy) return false
    if (!includesValue(dvd.magicType, state.type)) return false
    if (!includesValue(dvd.magician, state.magician)) return false
    if (state.featured === 'featured' && !dvd.featured) return false
    if (state.featured === 'not-featured' && dvd.featured) return false
    if (state.summary && state.summary !== 'all' && dvd.aiSummaryStatus !== state.summary) return false
    if (state.letter && state.letter !== 'all' && !dvd.title.toLocaleUpperCase().startsWith(state.letter.toLocaleUpperCase())) return false
    if (state.era && state.era !== 'all') {
      const year = Number(dvd.year)
      const decade = Number(String(state.era).replace(/[^0-9]/g, ''))
      if (!year || year < decade || year >= decade + 10) return false
    }
    return true
  })

  const sorted = [...output]
  const firstMagician = dvd => normalizeDVD(dvd).magician[0] || ''
  sorted.sort((a, b) => {
    if (state.sort === 'magician') return firstMagician(a).localeCompare(firstMagician(b)) || a.title.localeCompare(b.title)
    if (state.sort === 'year-new') return (Number(b.year) || 0) - (Number(a.year) || 0) || a.title.localeCompare(b.title)
    if (state.sort === 'year-old') return (Number(a.year) || Infinity) - (Number(b.year) || Infinity) || a.title.localeCompare(b.title)
    return a.title.localeCompare(b.title)
  })
  return sorted
}
