import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { en } = await import('@ihsaanly/core/strings/en')
const { fr } = await import('@ihsaanly/core/strings/fr')
const { setLocale } = await import('../i18n/store')
const { getStrings, stringsFor, useStrings } = await import('./index')

describe('strings', () => {
  beforeEach(resetStorage)

  it('picks the table for a language, and English for one it does not ship', () => {
    expect(stringsFor('fr')).toBe(fr)
    expect(stringsFor('klingon')).toBe(en)
  })

  it('follows the locale outside React', () => {
    setLocale('fr')
    expect(getStrings()).toBe(fr)
    setLocale('en-GB')
    expect(getStrings()).toBe(en)
  })

  it('follows the locale in a component', () => {
    setLocale('en-GB')
    const { result } = renderHook(() => useStrings())
    expect(result.current).toBe(en)

    act(() => setLocale('fr'))

    expect(result.current).toBe(fr)
  })
})
