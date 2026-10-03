import { describe, expect, it } from 'bun:test'

import { announcementData, identifierFor, parseNotificationData } from './payload'

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
    expect(parseNotificationData({ v: 1, kind: 'check-in' })).toEqual({ v: 1, kind: 'check-in' })
  })

  it('rejects junk', () => {
    expect(parseNotificationData(null)).toBeNull()
    expect(parseNotificationData({ itemId: 'x' })).toBeNull()
    expect(parseNotificationData({ v: 1, kind: 'prayer', prayer: 'sunrise' })).toBeNull()
    expect(parseNotificationData({ v: 2, kind: 'test' })).toBeNull()
  })
})

describe('announcement data', () => {
  const none = { v: 1, kind: 'announcement', route: null, url: null } as const

  it('keeps an in-app route and an https link', () => {
    expect(
      announcementData({ route: '/item/fasting-monday', url: 'https://ihsaanly.app/x' }),
    ).toEqual({
      v: 1,
      kind: 'announcement',
      route: '/item/fasting-monday',
      url: 'https://ihsaanly.app/x',
    })
  })

  it('drops targets that are not a plain path or an https page', () => {
    for (const route of ['//evil.example', 'item', 'javascript:x', '/a b']) {
      expect(announcementData({ route })).toEqual(none)
    }
    for (const url of ['http://ihsaanly.app', 'ihsaanly://x', 'not a url']) {
      expect(announcementData({ url })).toEqual(none)
    }
    expect(parseNotificationData({ v: 1, kind: 'announcement', route: 1, url: 2 })).toEqual(none)
  })

  it('is not an announcement without a route or a url', () => {
    expect(announcementData({})).toBeNull()
    expect(announcementData({ route: 42, other: 'x' })).toBeNull()
    expect(announcementData(null)).toBeNull()
    expect(announcementData('x')).toBeNull()
  })

  it('needs an object', () => {
    expect(announcementData(null)).toBeNull()
    expect(announcementData('x')).toBeNull()
  })
})

describe('identifiers for the pause', () => {
  const at = new Date(1_000)

  it('files the remembrance and the check-in under the plan prefix, one per moment', () => {
    expect(identifierFor({ kind: 'remembrance', itemId: 'r', prayer: 'asr', at, endsAt: at })).toBe(
      'plan:r:asr@1000',
    )
    expect(identifierFor({ kind: 'check-in', at })).toBe('plan:check-in@1000')
  })
})
