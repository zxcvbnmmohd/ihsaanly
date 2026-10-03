import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, render } from '@testing-library/react'
import { Appearance } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  preference: string
  onSelect: (value: 'light' | 'dark' | 'system') => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/appearance', 'AppearanceScreen')

const { default: AppearanceRoute } = await import('../../app/(more)/appearance')
const { getThemePreference, setThemePreference } = await import('@/theme/store')

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
})
