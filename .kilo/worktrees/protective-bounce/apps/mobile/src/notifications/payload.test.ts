import { describe, expect, it } from 'bun:test'

import { parseNotificationData } from './payload'

describe('notification data', () => {
  it('accepts each versioned shape', () => {
    expect(
      parseNotificationData({ v: 1, kind: 'item', itemId: 'x', endsAt: 5, reason: 'upcoming' }),
    ).toEqual({ v: 1, kind: 'item', itemId: 'x', endsAt: 5, reason: 'upcoming' })
    expect(parseNotificationData({ v: 1, kind: 'prayer', prayer: 'asr' })).toEqual({
      v: 1,
      kind: 'prayer',
      prayer: 'asr',
    })
    expect(parseNotificationData({ v: 1, kind: 'test' })).toEqual({ v: 1, kind: 'test' })
  })

  it('rejects junk', () => {
    expect(parseNotificationData(null)).toBeNull()
    expect(parseNotificationData({ itemId: 'x' })).toBeNull()
    expect(parseNotificationData({ v: 1, kind: 'prayer', prayer: 'sunrise' })).toBeNull()
    expect(parseNotificationData({ v: 2, kind: 'test' })).toBeNull()
  })
})
