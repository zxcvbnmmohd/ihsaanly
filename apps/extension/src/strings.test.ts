import { afterEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { fr } from '@ihsaanly/core/strings/fr'
import { chooseLanguage } from '@ihsaanly/state/i18n/store'
import { act, renderHook } from '@testing-library/react'
import { useExtensionStrings } from './strings'

afterEach(() => {
  act(() => {
    chooseLanguage('en')
  })
})

describe('useExtensionStrings', () => {
  it('words the English location copy for a browser, not a phone', () => {
    chooseLanguage('en')
    const { result } = renderHook(() => useExtensionStrings())
    expect(result.current.today.needsLocation).toContain('worked out in this browser')
    expect(result.current.location.useDeviceDetail).toBe(
      'Stays in this browser unless you sign in to sync.',
    )
    // Everything else is the shared English table.
    expect(result.current.today.title).toBe(en.today.title)
  })

  it('leaves other languages as the shared table has them', () => {
    chooseLanguage('fr')
    const { result } = renderHook(() => useExtensionStrings())
    expect(result.current.today.needsLocation).toBe(fr.today.needsLocation)
  })
})
