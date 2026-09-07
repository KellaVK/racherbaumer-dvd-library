export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value.toDate === 'function') return toDate(value.toDate())
  if (typeof value.seconds === 'number') return toDate(new Date(value.seconds * 1000))
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatFirestoreDate(value, options = {}) {
  const date = toDate(value)
  if (!date) return options.fallback || 'Not recorded'
  return new Intl.DateTimeFormat(options.locale, options.format || {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
