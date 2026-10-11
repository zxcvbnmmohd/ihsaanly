import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  language: SupportedLanguage
  onSelect: (language: SupportedLanguage) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/language', 'LanguageScreen')

// The native applyDirection flips the flags and reloads; the route only has
// to hand it the locale.
const applied: string[] = []
mock.module('@ihsaanly/state/i18n/direction', () => ({
  applyDirection: (locale: string) => void applied.push(locale),
}))

const { default: LanguageRoute } = await import('../../app/(more)/language')
const { getLocale, setLocale } = await import('@ihsaanly/state/i18n/store')

describe('language route', () => {
  beforeEach(() => {
    renders.length = 0
    applied.length = 0
    setLocale('en-GB')
  })

  afterEach(() => setLocale('en-GB'))

  it('shows the language of the stored locale', () => {
    render(<LanguageRoute />)
    expect(last(renders).language).toBe('en')
  })

  it('stores the choice and applies its direction', () => {
    render(<LanguageRoute />)
    act(() => last(renders).onSelect('ar'))
    expect(getLocale()).toStartWith('ar')
    expect(applied).toEqual([getLocale()])
    expect(last(renders).language).toBe('ar')
  })
})
