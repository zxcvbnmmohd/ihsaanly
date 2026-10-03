import { afterAll, afterEach, describe, expect, it } from 'bun:test'
import { installColors, restoreOS, restoreRouter, setOS } from '../../test/theme'

installColors()
const { colors, paletteFor, palettes } = await import('./colors')

const names = [
  'label',
  'secondaryLabel',
  'separator',
  'systemBackground',
  'secondarySystemBackground',
  'tint',
  'onTint',
] as const

afterEach(() => restoreOS())
afterAll(() => restoreRouter())

describe('colors', () => {
  it('are UIKit semantic colours on iOS', () => {
    setOS('ios')
    expect(colors.label).toBe('ios:label')
    expect(colors.secondaryLabel).toBe('ios:secondaryLabel')
    expect(colors.separator).toBe('ios:separator')
    expect(colors.systemBackground).toBe('ios:systemBackground')
    expect(colors.secondarySystemBackground).toBe('ios:secondarySystemBackground')
    expect(colors.tint).toBe('ios:systemBlue')
    expect(colors.onTint).toBe('ios:systemBackground')
  })

  it('are Material dynamic colours on Android', () => {
    setOS('android')
    expect(colors.label).toBe('android:onSurface')
    expect(colors.secondaryLabel).toBe('android:onSurfaceVariant')
    expect(colors.separator).toBe('android:outlineVariant')
    expect(colors.systemBackground).toBe('android:surface')
    expect(colors.secondarySystemBackground).toBe('android:surfaceContainer')
    expect(colors.tint).toBe('android:primary')
    expect(colors.onTint).toBe('android:onPrimary')
  })

  it('are plain hex elsewhere', () => {
    setOS('web')
    for (const name of names) expect(colors[name]).toMatch(/^#[0-9a-f]{6}$/)
    expect(colors.systemBackground).toBe('#ffffff')
  })

  it('are read fresh each time, not frozen at import', () => {
    setOS('ios')
    const first = colors.label
    setOS('android')
    expect(colors.label).not.toBe(first)
  })
})

describe('paletteFor', () => {
  it('picks dark only for dark', () => {
    expect(paletteFor('dark')).toBe(palettes.dark)
    expect(paletteFor('light')).toBe(palettes.light)
    expect(paletteFor(null)).toBe(palettes.light)
  })
})
