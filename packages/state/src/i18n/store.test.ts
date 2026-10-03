import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { reactNative } from '../../test/native'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { setContentLanguage, resolveText } = await import('@ihsaanly/core/content')
const { resolveLocale } = await import('@ihsaanly/core/i18n/locale')
const backend = await import('../storage/backend')
const { deviceLocaleTags } = await import('./device')
const { chooseLanguage, getLocale, setLocale, useLocale } = await import('./store')

describe('the locale', () => {
  beforeEach(() => {
    resetStorage()
    Object.assign(reactNative, { isRTL: false, os: 'ios', allowed: [], forced: [], reloads: [] })
  })
  afterEach(() => setContentLanguage('en'))

  it('starts as the device locale, resolved to one the app supports', () => {
    expect(getLocale()).toBe(resolveLocale(deviceLocaleTags()))
  })

  it('re-renders readers when the locale is set, and stores it', () => {
    const { result } = renderHook(() => useLocale())

    act(() => setLocale('fr'))

    expect(result.current).toBe('fr')
    expect(backend.readPreferenceRow('locale')).toEqual({ value: '"fr"' })
  })

  it('choosing a language stores a locale of it and switches the content language', () => {
    expect(chooseLanguage('fr')).toBe(false)

    expect(getLocale()).toBe('fr')
    expect(resolveText({ en: 'Hello', fr: 'Bonjour' })).toBe('Bonjour')
    expect(reactNative.forced).toEqual([])
  })

  it('choosing a right-to-left language flips the layout and says when to reopen (iOS)', () => {
    expect(chooseLanguage('ar')).toBe(true)

    expect(getLocale()).toBe('ar')
    expect(reactNative.forced).toEqual([true])
  })

  it('keeps the device region when it speaks the chosen language', () => {
    chooseLanguage('en')
    expect(getLocale().startsWith('en')).toBe(true)
  })
})
