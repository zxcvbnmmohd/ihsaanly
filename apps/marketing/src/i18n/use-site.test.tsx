import { afterEach, describe, expect, test } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { setSite, site } from '../../test/site'
import type { PageId } from './locales'

const { useSite } = await import('./use-site')
const { BUSINESS, PAGES, formatDate, localeFor } = await import('./locales')

afterEach(() => {
  site.messages = null
})

describe('useSite', () => {
  test('English home: root links, no page date, English link to itself', () => {
    setSite()
    const { result } = renderHook(() => useSite())
    expect(result.current.locale.code).toBe('en')
    expect(result.current.page?.id).toBe('home')
    expect(result.current.links.home).toBe('/')
    expect(result.current.links.privacy).toBe('/legal/privacy/')
    expect(result.current.links.support).toBe('/#questions')
    expect(result.current.links.english).toBe('/')
    expect(result.current.links.date).toBe('')
    expect(result.current.links.email).toBe('mailto:support@ihsaanly.app')
    expect(result.current.links.year).toBe(String(new Date().getUTCFullYear()))
    expect(result.current.links.companionHost).toBe(
      new URL(result.current.links.companion ?? '').host,
    )
    expect(result.current.links.province).toBe(BUSINESS.province ?? '')
  })

  test('a legal page in another language links back to its English twin and dates itself', () => {
    setSite({ lang: 'fr', routeId: '/{-$lang}/legal/privacy/' })
    const { result } = renderHook(() => useSite())
    expect(result.current.locale.code).toBe('fr')
    expect(result.current.page?.id).toBe('privacy')
    expect(result.current.links.home).toBe('/fr/')
    expect(result.current.links.english).toBe('/legal/privacy/')
    expect(result.current.links.date).toBe(
      formatDate(PAGES.privacy.updated as Date, localeFor('fr')),
    )
  })

  test.each<[string, PageId]>([
    ['/{-$lang}/legal/terms/', 'terms'],
    ['/{-$lang}/legal/terms', 'terms'],
    ['/{-$lang}/legal/privacy', 'privacy'],
    ['/{-$lang}/legal/delete-account/', 'deleteAccount'],
    ['/{-$lang}/legal/delete-account', 'deleteAccount'],
  ])('route %s is the %s page', (routeId, id) => {
    setSite({ routeId })
    expect(renderHook(() => useSite()).result.current.page?.id).toBe(id)
  })

  test('a route that is no page (404) has none', () => {
    setSite({ routeId: '/404' })
    const { result } = renderHook(() => useSite())
    expect(result.current.page).toBeNull()
    expect(result.current.links.english).toBe('/')
  })

  test('an unknown language parameter falls back to English', () => {
    setSite()
    site.lang = 'xx'
    expect(renderHook(() => useSite()).result.current.locale.code).toBe('en')
  })

  test('t renders markup with placeholders filled; a gives plain text', () => {
    setSite({ lang: 'en' })
    const { result } = renderHook(() => useSite())
    const text = result.current.a('common.footer.copyright')
    expect(text).not.toContain('{')
    expect(text).not.toContain('<')
    expect(result.current.t('common.footer.copyright')).toBeTruthy()
  })

  test('an unknown string key throws', () => {
    setSite()
    const { result } = renderHook(() => useSite())
    expect(() => result.current.a('no.such.key')).toThrow('Unknown string "no.such.key"')
  })

  test('throws when no route loaded messages', () => {
    setSite()
    site.messages = null
    expect(() => renderHook(() => useSite())).toThrow('useSite needs a route that loads messages')
  })
})
