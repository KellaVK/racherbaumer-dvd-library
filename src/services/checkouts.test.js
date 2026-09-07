import { describe, expect, it } from 'vitest'
import { checkoutLockId, getCheckoutLane } from './checkouts'

describe('checkout helpers', () => {
  it('creates a stable, safe lock id for one DVD and borrower', () => {
    expect(checkoutLockId('dvd/one', 'user two')).toBe('dvd_one_user_two')
  })

  it('places new requests in the correct lane', () => {
    expect(getCheckoutLane({ checkedOutBy: null })).toBe('pending')
    expect(getCheckoutLane({ checkedOutBy: 'someone' })).toBe('queued')
  })
})
