const SUMMARY_FIELDS = ['title', 'magician', 'magicType', 'producer', 'year', 'notes', 'otherFeatures']

export function buildSummaryPrompt(dvd = {}) {
  const metadata = SUMMARY_FIELDS
    .map(field => [field, Array.isArray(dvd[field]) ? dvd[field].join(', ') : dvd[field]])
    .filter(([, value]) => String(value ?? '').trim())
    .map(([field, value]) => `${field}: ${String(value).trim()}`)
    .join('\n')
  return `Write a concise 2–4 sentence catalog summary for this magic DVD using only the stored metadata below. Describe what the DVD teaches or contains and who it is suited for only when those facts are supported. If there is not enough information for a factual summary, respond with exactly INSUFFICIENT. Be conservative and do not invent effects, techniques, performers, history, or claims.\n\n${metadata}`
}

export function parseSummaryResponse(response) {
  const summary = (response?.content || [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim()
  if (!summary || /^insufficient[.!]?$/i.test(summary)) return { status: 'insufficient', summary: '' }
  return { status: 'complete', summary: summary.slice(0, 1800) }
}

export async function generateClaudeSummary(dvd, env) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 320,
      temperature: 0,
      messages: [{ role: 'user', content: buildSummaryPrompt(dvd) }],
    }),
  })
  if (!response.ok) throw new Error(`Claude request failed (${response.status})`)
  return parseSummaryResponse(await response.json())
}
