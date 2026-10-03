import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { act, render } from '@testing-library/react'
import { Alert } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  language: SupportedLanguage
  onSelect: (language: SupportedLanguage) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/language', 'LanguageScreen')

const alerts: unknown[][] = []
const realAlert = Alert.alert

// The web twin of applyDirection always answers false; the native one answers
// true on iOS when the direction flips, which is the case under test.
const direction = { needsReopen: false, applied: [] as string[] }
mock.module('@ihsaanly/state/i18n/direction', () => ({
  applyDirection: (locale: string) => {
    direction.applied.push(locale)
    return direction.needsReopen
  },
}))

const { default: LanguageRoute } = await import('../../app/(more)/language')
const { getLocale, setLocale } = await import('@ihsaanly/state/i18n/store')
const { getStrings } = await import('@ihsaanly/state/strings')

describe('language route', () => {
  beforeEach(() => {
    renders.length = 0
    alerts.length = 0
    Alert.alert = (...args: unknown[]) => void alerts.push(args)
    direction.needsReopen = false
    direction.applied.length = 0
    setLocale('en-GB')
  })

  afterEach(() => {
    Alert.alert = realAlert
    setLocale('en-GB')
  })

  it('shows the language of the stored locale', () => {
    render(<LanguageRoute />)
    expect(last(renders).language).toBe('en')
  })

  it('stores the choice and says to reopen when the layout direction flips', () => {
    const { reopenTitle, reopenBody } = getStrings().language
    direction.needsReopen = true
    render(<LanguageRoute />)
    act(() => last(renders).onSelect('ar'))
    expect(getLocale()).toStartWith('ar')
    expect(direction.applied).toEqual([getLocale()])
    expect(last(renders).language).toBe('ar')
    expect(alerts).toEqual([[reopenTitle, reopenBody]])
  })

  it('stays quiet when nothing needs reopening', () => {
    render(<LanguageRoute />)
    act(() => last(renders).onSelect('en'))
    expect(alerts).toEqual([])
  })
})
