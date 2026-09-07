import { describe, expect, it } from 'vitest'
import {
  displayValue,
  filterDVDs,
  normalizeDVD,
  normalizeList,
  normalizeTitle,
  titleSimilarity,
  validateDVDForm,
} from './dvd'

describe('DVD normalization', () => {
  it('normalizes legacy strings and placeholder metadata', () => {
    expect(normalizeDVD({
      title: ' Test ',
      magician: 'A; B',
      magicType: ['?', 'Cards'],
      aiSummary: '',
    })).toMatchObject({
      title: 'Test',
      magician: ['A', 'B'],
      magicType: ['Cards'],
      featured: false,
      aiSummaryStatus: 'not_requested',
    })
  })

  it('deduplicates normalized lists and hides placeholders', () => {
    expect(normalizeList('Cards; cards, Unknown / Coins')).toEqual(['Cards', 'Coins'])
    expect(displayValue('?')).toBe('Not listed')
    expect(displayValue(['A', 'B'])).toBe('A, B')
  })

  it('derives complete AI status for legacy summaries', () => {
    expect(normalizeDVD({ aiSummary: 'A useful summary.' }).aiSummaryStatus).toBe('complete')
  })
})

describe('DVD validation and matching', () => {
  it('validates required fields, year, and vendor URLs', () => {
    expect(validateDVDForm({ title: '', year: '22', penguinUrl: 'http://bad.test' })).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        year: expect.any(String),
        penguinUrl: expect.any(String),
      }),
    )
  })

  it('accepts blank optional fields and HTTPS URLs', () => {
    expect(validateDVDForm({ title: 'Card Magic', year: '2004', penguinUrl: 'https://penguinmagic.com/p/1' })).toEqual({})
  })

  it('finds a close title without treating numbered volumes as identical', () => {
    expect(titleSimilarity('Optical Dellusions', 'Optical Delusions')).toBeGreaterThan(0.85)
    expect(normalizeTitle('Card Magic Vol. 1')).not.toBe(normalizeTitle('Card Magic Vol. 2'))
  })
})

describe('catalog filtering', () => {
  const dvds = [
    normalizeDVD({ id: '1', title: 'Card College', magician: 'Roberto Giobbi', magicType: 'Cards', year: 2001, featured: true }),
    normalizeDVD({ id: '2', title: 'Coin Magic', magician: 'David Roth', magicType: 'Coins', checkedOutBy: 'u1', aiSummary: 'Coins.' }),
  ]

  it('combines facets and sorts without mutating input', () => {
    const copy = [...dvds]
    expect(filterDVDs(dvds, { availability: 'available', type: 'Cards', sort: 'title' }).map(d => d.id)).toEqual(['1'])
    expect(dvds).toEqual(copy)
  })

  it('supports featured, summary, and A-Z filters', () => {
    expect(filterDVDs(dvds, { featured: 'featured' }).map(d => d.id)).toEqual(['1'])
    expect(filterDVDs(dvds, { summary: 'complete' }).map(d => d.id)).toEqual(['2'])
    expect(filterDVDs(dvds, { letter: 'C' })).toHaveLength(2)
  })
})
