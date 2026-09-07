import { describe, expect, it } from 'vitest'
import { assertRoleChange } from './users'

describe('role protection', () => {
  it('prevents an admin from demoting their own account', () => {
    expect(() => assertRoleChange({ actorId: 'a', userId: 'a', currentRole: 'admin', nextRole: 'approved' })).toThrow(/own admin/i)
  })

  it('accepts supported roles for other users', () => {
    expect(assertRoleChange({ actorId: 'a', userId: 'b', currentRole: 'pending', nextRole: 'approved' })).toBe(true)
  })
})
