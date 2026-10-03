import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { memoriseFixture } from './fixtures'
import { MemoriseScreen } from './memorise'

describe('MemoriseScreen', () => {
  it('shows the Arabic and only the revealed lines', () => {
    renderScreen(<MemoriseScreen {...memoriseFixture} />)
    expect(screen.getByText(memoriseFixture.arabic as string)).toBeInTheDocument()
    expect(screen.getByText(memoriseFixture.transliteration as string)).toBeInTheDocument()
    expect(screen.queryByText(memoriseFixture.translation as string)).toBeNull()
  })

  it('reveals the translation and hides the transliteration as told', () => {
    renderScreen(
      <MemoriseScreen
        {...memoriseFixture}
        reveal={{ transliteration: false, translation: true }}
      />,
    )
    expect(screen.getByText(memoriseFixture.translation as string)).toBeInTheDocument()
    expect(screen.queryByText(memoriseFixture.transliteration as string)).toBeNull()
  })

  it('does not show a revealed line that the dua does not have', () => {
    renderScreen(
      <MemoriseScreen
        {...memoriseFixture}
        transliteration={null}
        translation={null}
        reveal={{ transliteration: true, translation: true }}
      />,
    )
    expect(screen.getByText(memoriseFixture.arabic as string)).toBeInTheDocument()
  })

  it('has no card without Arabic', () => {
    renderScreen(<MemoriseScreen {...memoriseFixture} arabic={null} />)
    expect(screen.queryByText(memoriseFixture.transliteration as string)).toBeNull()
  })

  it('says there is no audio and lets the reader hide a line and mark it known', async () => {
    const onHideOne = mock(() => {})
    const onToggleKnown = mock(() => {})
    const { user, strings } = renderScreen(
      <MemoriseScreen {...memoriseFixture} onHideOne={onHideOne} onToggleKnown={onToggleKnown} />,
    )
    expect(screen.getByText(strings.memorise.noAudio)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.memorise.hide }))
    await user.click(screen.getByRole('button', { name: named(strings.memorise.notKnown) }))
    expect(onHideOne).toHaveBeenCalledTimes(1)
    expect(onToggleKnown).toHaveBeenCalledTimes(1)
  })

  it('plays and loops when there is audio, and shows it is known', async () => {
    const onTogglePlay = mock(() => {})
    const onToggleLoop = mock(() => {})
    const { user, strings } = renderScreen(
      <MemoriseScreen
        {...memoriseFixture}
        hasAudio
        known
        onTogglePlay={onTogglePlay}
        onToggleLoop={onToggleLoop}
      />,
    )
    expect(screen.getByRole('button', { name: named(strings.memorise.known) })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.memorise.play }))
    await user.click(screen.getByRole('button', { name: named(strings.memorise.loop) }))
    expect(onTogglePlay).toHaveBeenCalledTimes(1)
    expect(onToggleLoop).toHaveBeenCalledTimes(1)
  })

  it('offers stop while playing', () => {
    const { strings } = renderScreen(
      <MemoriseScreen {...memoriseFixture} hasAudio playing looping />,
    )
    expect(screen.getByRole('button', { name: strings.memorise.stop })).toBeInTheDocument()
  })
})
