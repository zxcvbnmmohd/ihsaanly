import { describe, expect, it, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTheme, renderWeb } from './scripts/render'
import { ACCENTS, accents, brand, DEFAULT_ACCENT, paletteFor, palettes } from './tokens'

test('theme.css and web.css match tokens.ts (run `bun run generate`)', () => {
  expect(readFileSync(join(import.meta.dir, 'theme.css'), 'utf8')).toBe(renderTheme())
  expect(readFileSync(join(import.meta.dir, 'web.css'), 'utf8')).toBe(renderWeb())
})

test('the JavaScript palette is built from the same brand colours', () => {
  expect(palettes.light.accent).toBe(brand.accent.light)
  expect(palettes.dark.wash).toEqual([brand['wash-top'].dark, brand['wash-bottom'].dark])
  expect(palettes.dark.widgetSurface).toBe(brand.paper.dark)
})

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe.each([...ACCENTS])('the %s accent', (name) => {
  const tokens = accents[name]

  it.each(['light', 'dark'] as const)('passes WCAG AA on the %s wash', (scheme) => {
    const accent = tokens.accent[scheme]
    const top = brand['wash-top'][scheme]
    const bottom = brand['wash-bottom'][scheme]
    const paper = brand.paper[scheme]
    // Accent text and buttons on the wash's top and on cards.
    expect(contrast(accent, top)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(accent, paper)).toBeGreaterThanOrEqual(4.5)
    // A control's outline or a mark at the wash's deepest point (WCAG 1.4.11).
    expect(contrast(accent, bottom)).toBeGreaterThanOrEqual(3)
    // Link text anywhere on the wash.
    for (const ground of [top, bottom, paper]) {
      expect(contrast(tokens['accent-ink'][scheme], ground)).toBeGreaterThanOrEqual(4.5)
    }
    // A label on an accent-filled button.
    expect(contrast(tokens['on-accent'][scheme], accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('derives its tints from the accent', () => {
    expect(tokens.indicator.light).toMatch(/^rgba\(\d+, \d+, \d+, 0\.16\)$/)
    expect(tokens.tint.dark).toMatch(/^rgba\(\d+, \d+, \d+, 0\.14\)$/)
  })

  it('resolves a palette that changes only the accent colours', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const palette = paletteFor(scheme, name)
      expect(palette).toBe(paletteFor(scheme, name))
      expect(palette).toMatchObject({
        accent: tokens.accent[scheme],
        accentInk: tokens['accent-ink'][scheme],
        onAccent: tokens['on-accent'][scheme],
        indicator: tokens.indicator[scheme],
        tint: tokens.tint[scheme],
        wash: palettes[scheme].wash,
        ink: palettes[scheme].ink,
      })
    }
  })
})

test('terracotta is the default and the brand accent', () => {
  expect(DEFAULT_ACCENT).toBe('terracotta')
  expect(paletteFor('light')).toBe(palettes.light)
  expect(paletteFor('dark', 'terracotta')).toBe(palettes.dark)
  expect(accents.terracotta.indicator.light).toBe('rgba(169, 74, 50, 0.16)')
  expect(brand.tint.dark).toBe(accents.terracotta.tint.dark)
  expect(new Set(ACCENTS.map((name) => accents[name].accent.light)).size).toBe(ACCENTS.length)
})
