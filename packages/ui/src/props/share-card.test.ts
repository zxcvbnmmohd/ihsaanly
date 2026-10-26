import { describe, expect, it } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { shareCardFit, shareCardSize, shareCardTheme } from './share-card'

const sources = { light: palettes.light, dark: palettes.dark, current: palettes.dark }

const card = (translation: string): Parameters<typeof shareCardFit>[0] => ({
  title: 'A dua',
  arabic: null,
  transliteration: null,
  translation,
  source: null,
})

describe('shareCardTheme', () => {
  it('paints paper light from the light palette, previewed on the dark wash', () => {
    expect(shareCardTheme('paper-light', sources)).toEqual({
      wash: palettes.light.wash,
      ink: palettes.light.ink,
      inkSecondary: palettes.light.inkSecondary,
      accent: palettes.light.accent,
      backdrop: palettes.dark.wash[0],
    })
  })

  it('paints paper dark from the dark palette, previewed on the light wash', () => {
    const theme = shareCardTheme('paper-dark', sources)
    expect(theme.ink).toBe(palettes.dark.ink)
    expect(theme.backdrop).toBe(palettes.light.wash[0])
  })

  it('fills the accent style with the current accent and writes on it', () => {
    expect(shareCardTheme('accent', sources)).toEqual({
      wash: [palettes.dark.accent, palettes.dark.accent],
      ink: palettes.dark.onAccent,
      inkSecondary: palettes.dark.onAccent,
      accent: palettes.dark.onAccent,
      backdrop: palettes.dark.accent,
    })
  })

  it('follows whatever palettes a theme passes in', () => {
    const themed = { ...palettes.light, accent: palettes.dark.ink }
    expect(shareCardTheme('accent', { ...sources, current: themed }).wash).toEqual([
      palettes.dark.ink,
      palettes.dark.ink,
    ])
  })

  it('rejects a style it does not know', () => {
    expect(() => shareCardTheme('neon' as never, sources)).toThrow()
  })
})

describe('shareCardSize', () => {
  it('is 9:16 for a story and 1:1 for a square', () => {
    expect(shareCardSize('story')).toEqual({ width: 360, height: 640 })
    expect(shareCardSize('square')).toEqual({ width: 360, height: 360 })
  })
})

describe('shareCardFit', () => {
  it('steps the type down as the text grows, sooner on a square', () => {
    expect(shareCardFit(card('a'.repeat(100)), 'story')).toBe('regular')
    expect(shareCardFit(card('a'.repeat(100)), 'square')).toBe('regular')
    expect(shareCardFit(card('a'.repeat(300)), 'square')).toBe('compact')
    expect(shareCardFit(card('a'.repeat(300)), 'story')).toBe('regular')
    expect(shareCardFit(card('a'.repeat(600)), 'story')).toBe('compact')
    expect(shareCardFit(card('a'.repeat(800)), 'story')).toBe('small')
  })

  it('counts the Arabic and the transliteration too', () => {
    expect(
      shareCardFit(
        { ...card('a'.repeat(60)), arabic: 'ب'.repeat(60), transliteration: 'b'.repeat(60) },
        'square',
      ),
    ).toBe('compact')
  })
})
