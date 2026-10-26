import { describe, expect, it } from 'bun:test'
import { paletteFor, palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { shareCardTheme } from '../props/share-card'
import { SHARE_WATERMARK, ShareCard } from './share-card'

const theme = shareCardTheme('paper-light', { ...palettes, current: palettes.light })

const dua = {
  title: 'Leaving home',
  arabic: 'بِسْمِ اللَّهِ',
  transliteration: 'Bismillah',
  translation: 'In the name of Allah',
  source: 'Abu Dawud 5095',
}

/** react-native-web writes a hex colour into the DOM as rgba with two decimals. */
function rgba(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${r}, ${g}, ${b}, 1.00)`
}

describe('ShareCard', () => {
  it('shows every part of a dua and the watermark', () => {
    renderScreen(<ShareCard card={dua} theme={theme} background="solid" aspect="story" />)
    for (const text of [
      'Leaving home',
      'بِسْمِ اللَّهِ',
      'Bismillah',
      'In the name of Allah',
      'Abu Dawud 5095',
      SHARE_WATERMARK,
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument()
    }
    expect(screen.getByText('Leaving home').style.color).toBe(rgba(palettes.light.ink))
  })

  it('is 9:16 for a story and square for a square', () => {
    const { unmount } = renderScreen(
      <ShareCard card={dua} theme={theme} background="solid" aspect="story" />,
    )
    expect(screen.getByTestId('share-card')).toHaveStyle({ width: '360px', height: '640px' })
    unmount()
    renderScreen(<ShareCard card={dua} theme={theme} background="solid" aspect="square" />)
    expect(screen.getByTestId('share-card')).toHaveStyle({ width: '360px', height: '360px' })
  })

  it('draws no background when transparent', () => {
    renderScreen(<ShareCard card={dua} theme={theme} background="transparent" aspect="square" />)
    const card = screen.getByTestId('share-card')
    expect(card.style.backgroundImage).toBe('')
    expect(card.style.backgroundColor).toBe('')
  })

  it('leaves out what the dua does not have', () => {
    renderScreen(
      <ShareCard
        theme={theme}
        background="solid"
        aspect="story"
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
    expect(screen.getByText(SHARE_WATERMARK)).toBeInTheDocument()
  })

  it('signs the card in the chosen accent', () => {
    const plum = paletteFor('dark', 'plum')
    const plumTheme = shareCardTheme('paper-dark', {
      light: paletteFor('light', 'plum'),
      dark: plum,
      current: plum,
    })
    renderScreen(
      <ShareCard
        theme={plumTheme}
        background="solid"
        aspect="story"
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
    expect(screen.getByText(SHARE_WATERMARK).style.color).toBe(rgba(plum.accent))
  })
})
