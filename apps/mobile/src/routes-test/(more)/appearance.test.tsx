import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, render } from '@testing-library/react'
import { Appearance } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  preference: string
  onSelect: (value: 'light' | 'dark' | 'system') => void
  accent: string
  onSelectAccent: (value: 'terracotta' | 'denim') => void
  reading: { arabicFirst: boolean; align: 'start' | 'center' }
  onReading: (change: { arabicFirst?: boolean; align?: 'start' | 'center' }) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/appearance', 'AppearanceScreen')

const { default: AppearanceRoute } = await import('../../app/(more)/appearance')
const { getThemePreference, setThemePreference } = await import('@/theme/store')
const { getAccent, setAccent } = await import('@ihsaanly/state/theme/accent-store')
const { getReaderPreferences, updateReaderPreferences } = await import(
  '@ihsaanly/state/reader/store'
)

const applied: unknown[] = []
;(Appearance as unknown as { setColorScheme: (v: unknown) => void }).setColorScheme = (v) =>
  applied.push(v)

describe('appearance route', () => {
  beforeEach(() => {
    renders.length = 0
    setThemePreference('system')
    applied.length = 0
  })

  it('shows the stored preference', () => {
    setThemePreference('dark')
    render(<AppearanceRoute />)
    expect(last(renders).preference).toBe('dark')
  })

  it('stores the chosen preference and re-renders with it', () => {
    render(<AppearanceRoute />)
    act(() => last(renders).onSelect('light'))
    expect(getThemePreference()).toBe('light')
    expect(last(renders).preference).toBe('light')
    expect(applied).toEqual(['light'])
  })

  it('shows the stored accent and stores a new one, leaving the theme alone', () => {
    render(<AppearanceRoute />)
    expect(last(renders).accent).toBe('terracotta')
    act(() => last(renders).onSelectAccent('denim'))
    expect(getAccent()).toBe('denim')
    expect(last(renders).accent).toBe('denim')
    expect(getThemePreference()).toBe('system')
    expect(applied).toEqual([])
    act(() => setAccent('terracotta'))
  })

  it('shows and stores the reading layout, keeping the brief or detailed choice', () => {
    act(() => updateReaderPreferences({ arabicFirst: true, align: 'center', detail: 'brief' }))
    render(<AppearanceRoute />)
    expect(last(renders).reading).toEqual({ arabicFirst: true, align: 'center' })
    act(() => last(renders).onReading({ arabicFirst: false }))
    act(() => last(renders).onReading({ align: 'start' }))
    expect(last(renders).reading).toEqual({ arabicFirst: false, align: 'start' })
    expect(getReaderPreferences()).toEqual({ arabicFirst: false, align: 'start', detail: 'brief' })
    act(() => updateReaderPreferences({ arabicFirst: true, align: 'center', detail: 'detailed' }))
  })
})
