import { describe, expect, it } from 'vitest'
import { buildSummaryPrompt, parseSummaryResponse } from './claude-summary'

describe('Claude summary contract', () => {
  it('limits the prompt to stored metadata and asks for uncertainty', () => {
    const prompt = buildSummaryPrompt({ title: 'Coin Magic', notes: 'Three routines', magician: ['A'] })
    expect(prompt).toContain('Coin Magic')
    expect(prompt).toContain('Three routines')
    expect(prompt).toContain('do not invent')
  })

  it('accepts concise summaries and rejects empty output', () => {
    expect(parseSummaryResponse({ content: [{ type: 'text', text: 'A concise overview.' }] })).toEqual({ status: 'complete', summary: 'A concise overview.' })
    expect(parseSummaryResponse({ content: [] })).toEqual({ status: 'insufficient', summary: '' })
  })
})
