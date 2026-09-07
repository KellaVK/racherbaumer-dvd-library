import { describe, expect, it } from 'vitest'
import { buildDVDPayload } from './dvds'

describe('DVD write payload', () => {
  it('normalizes form lists and initializes summaries for new records', () => {
    expect(buildDVDPayload({ title: '  Card Magic ', magician: 'A; B', magicType: 'Cards', featured: true }, { isNew: true })).toMatchObject({
      title: 'Card Magic', magician: ['A', 'B'], magicType: ['Cards'], featured: true,
      aiSummary: '', aiSummaryStatus: 'generating', checkedOutBy: null,
    })
  })

  it('does not overwrite existing summary fields during an edit', () => {
    expect(buildDVDPayload({ title: 'X', aiSummary: 'Keep me' }, { isNew: false })).not.toHaveProperty('aiSummary')
  })
})
