import { describe, expect, it, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTheme, renderWeb } from './scripts/render'
import {
  APPEARANCES,
  BRAND_APPEARANCES,
  brand,
  colorsFor,
  counterpartOf,
  isTheme,
  paletteFor,
  palettePair,
  palettes,
  schemeOf,
  THEMES,
  themeOf,
  themeSystemColors,
  themes,
} from './tokens'

test('theme.css and web.css match tokens.ts (run `bun run generate`)', () => {
  expect(readFileSync(join(import.meta.dir, 'theme.css'), 'utf8')).toBe(renderTheme())
  expect(readFileSync(join(import.meta.dir, 'web.css'), 'utf8')).toBe(renderWeb())
})

test('web.css carries every theme under data-palette, with its scheme', () => {
  const css = renderWeb()
  for (const name of THEMES) {
    expect(css).toContain(`:root[data-palette='${name}'] {`)
  }
  expect(css).toContain('color-scheme: dark;')
})

test('the JavaScript palette is built from the same brand colours', () => {
  expect(palettes.light.accent).toBe(brand.accent.light)
  expect(palettes.dark.wash).toEqual([brand['wash-top'].dark, brand['wash-bottom'].dark])
  expect(palettes.dark.widgetSurface).toBe(brand.paper.dark)
  expect(palettes.light.scheme).toBe('light')
  expect(paletteFor('light')).toBe(palettes.light)
  expect(paletteFor('dark', undefined)).toBe(palettes.dark)
  expect(colorsFor('dark').ink).toBe(brand.ink.dark)
  expect(palettePair()).toBe(palettes)
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

describe.each([...THEMES])('the %s theme', (name) => {
  const { colors, scheme } = themes[name]
  const grounds = [colors['wash-top'], colors['wash-bottom'], colors.paper]

  it('passes WCAG AA for text on its wash and paper', () => {
    for (const ground of grounds) {
      expect(contrast(colors.ink, ground)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colors['ink-secondary'], ground)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colors['ink-soft'], ground)).toBeGreaterThanOrEqual(4.5)
      // Accent text and buttons, and link text, anywhere on the canvas.
      expect(contrast(colors.accent, ground)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(colors['accent-ink'], ground)).toBeGreaterThanOrEqual(4.5)
    }
    // A label on an accent-filled button.
    expect(contrast(colors['on-accent'], colors.accent)).toBeGreaterThanOrEqual(4.5)
  })

  it('outlines its controls at 3:1 (WCAG 1.4.11)', () => {
    for (const ground of grounds) {
      expect(contrast(colors['rule-strong'], ground)).toBeGreaterThanOrEqual(3)
      expect(contrast(colors['field-border'], ground)).toBeGreaterThanOrEqual(3)
    }
  })

  it('is a whole canvas in its own scheme, not just an accent', () => {
    for (const key of ['wash-top', 'wash-bottom', 'paper', 'ink', 'accent'] as const) {
      expect(colors[key]).not.toBe(brand[key][scheme])
    }
    // Dark themes are dark: the wash darker than the ink, and the reverse for light.
    const darkGround = luminance(colors['wash-top']) < luminance(colors.ink)
    expect(darkGround).toBe(scheme === 'dark')
    expect(colors.indicator).toMatch(/^rgba\(\d+, \d+, \d+, 0\.(16|22)\)$/)
    expect(colors.surface).toMatch(/^rgba\(/)
  })

  it('resolves one palette, whatever scheme is asked for', () => {
    const palette = paletteFor('light', name)
    expect(palette).toBe(paletteFor('dark', name))
    expect(palette).toMatchObject({
      scheme,
      wash: [colors['wash-top'], colors['wash-bottom']],
      accent: colors.accent,
      accentInk: colors['accent-ink'],
      onAccent: colors['on-accent'],
      ink: colors.ink,
      inkSecondary: colors['ink-secondary'],
      paper: colors.paper,
      widgetSurface: colors.paper,
      fieldBorder: colors['field-border'],
    })
    expect(colorsFor('light', name)).toBe(colors)
  })

  it('pairs with a counterpart in the other scheme whose accent reads on its ink', () => {
    const other = counterpartOf(name)
    expect(themes[other].scheme).not.toBe(scheme)
    expect(counterpartOf(other)).toBe(name)
    const pair = palettePair(name)
    expect(pair[scheme]).toBe(paletteFor(scheme, name))
    expect(pair[themes[other].scheme]).toBe(paletteFor(scheme, other))
    // The toast is an ink pill whose action takes the counterpart's accent.
    expect(contrast(themes[other].colors.accent, colors.ink)).toBeGreaterThanOrEqual(4.5)
  })

  it('stands in for the system colours with its own ink and paper', () => {
    const system = themeSystemColors(name)
    expect(system['system-label']).toBe(colors.ink)
    expect(system['system-secondary-background']).toBe(colors.paper)
    expect(contrast(system['system-on-tint'], system['system-tint'])).toBeGreaterThanOrEqual(4.5)
  })
})

test('ten themes, five dark and five light, each its own accent', () => {
  expect(THEMES).toHaveLength(10)
  expect(THEMES.filter((name) => themes[name].scheme === 'dark')).toHaveLength(5)
  expect(new Set(THEMES.map((name) => themes[name].colors.accent)).size).toBe(10)
})

test('the appearances are the brand three, then the themes', () => {
  expect(APPEARANCES).toEqual([...BRAND_APPEARANCES, ...THEMES])
  expect(isTheme('obsidian')).toBe(true)
  expect(isTheme('dark')).toBe(false)
  expect(themeOf('sky')).toBe('sky')
  expect(themeOf('system')).toBeUndefined()
})

test('an appearance resolves its scheme', () => {
  expect(schemeOf('system', 'dark')).toBe('dark')
  expect(schemeOf('system', 'light')).toBe('light')
  expect(schemeOf('light', 'dark')).toBe('light')
  expect(schemeOf('dark', 'light')).toBe('dark')
  expect(schemeOf('obsidian', 'light')).toBe('dark')
  expect(schemeOf('ivory', 'dark')).toBe('light')
})
