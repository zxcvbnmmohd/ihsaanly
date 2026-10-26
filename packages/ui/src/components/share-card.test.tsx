import { describe, expect, it } from 'bun:test'
import { paletteFor, palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { ShareCard } from './share-card'

const palette = palettes.light

describe('ShareCard', () => {
  it('shows every part of a dua', () => {
    renderScreen(
      <ShareCard
        palette={palette}
        card={{
          title: 'Leaving home',
          arabic: 'بِسْمِ اللَّهِ',
          transliteration: 'Bismillah',
          translation: 'In the name of Allah',
          source: 'Abu Dawud 5095',
        }}
      />,
    )
    for (const text of [
      'Leaving home',
      'بِسْمِ اللَّهِ',
      'Bismillah',
      'In the name of Allah',
      'Abu Dawud 5095',
      'Ihsaanly',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
  })

  it('leaves out what the dua does not have', () => {
    renderScreen(
      <ShareCard
        palette={palette}
        card={{
          title: 'Plain',
          arabic: null,
          transliteration: null,
          translation: null,
          source: null,
        }}
      />,
    )
    expect(screen.getByText('Plain')).toBeInTheDocument()
    expect(screen.queryByText('Bismillah')).toBeNull()
  })

  it('signs the card in the chosen accent', () => {
    const plum = paletteFor('dark', 'plum')
    renderScreen(
      <ShareCard
        palette={plum}
        card={{
          title: 'Plain',
          arabic: null,
          transliteration: null,
          translation: null,
          source: null,
        }}
      />,
      { scheme: 'dark', accent: 'plum' },
    )
    // #d79acb, the plum accent in the dark scheme.
    expect(plum.accent).toBe('#d79acb')
    expect(screen.getByText('Ihsaanly').style.color).toBe('rgba(215, 154, 203, 1.00)')
  })
})
