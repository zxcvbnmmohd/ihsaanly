import { describe, expect, test } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { documentTitle, isIndexable } from './title'

const FALLBACK = 'Ihsaanly · The sunnah that fits the moment'

describe('documentTitle', () => {
  test('a tab or settings page is "<screen> · Ihsaanly"', () => {
    expect(documentTitle({ routeId: '/today', params: {} }, en, FALLBACK)).toBe('Today · Ihsaanly')
    expect(documentTitle({ routeId: '/_library/library', params: {} }, en, FALLBACK)).toBe(
      'Library · Ihsaanly',
    )
    expect(documentTitle({ routeId: '/_more/account', params: {} }, en, FALLBACK)).toBe(
      'Account · Ihsaanly',
    )
  })

  test('an unknown item and an unmatched URL are "Not found"', () => {
    expect(
      documentTitle({ routeId: '/_library/item/$id', params: { id: 'nope' } }, en, FALLBACK),
    ).toBe('Not found · Ihsaanly')
    expect(documentTitle({ routeId: '__root__', params: {} }, en, FALLBACK)).toBe(
      'Not found · Ihsaanly',
    )
  })

  test('onboarding keeps the default title; a development build is prefixed', () => {
    expect(
      documentTitle({ routeId: '/onboarding/$step', params: { step: 'welcome' } }, en, FALLBACK),
    ).toBe(FALLBACK)
    expect(documentTitle({ routeId: '/today', params: {} }, en, FALLBACK, 'Dev · ')).toBe(
      'Dev · Today · Ihsaanly',
    )
  })
})

test('only the door and the first onboarding step are indexable', () => {
  expect(isIndexable('/')).toBe(true)
  expect(isIndexable('/onboarding/welcome')).toBe(true)
  expect(isIndexable('/today')).toBe(false)
  expect(isIndexable('/item/abc')).toBe(false)
})
