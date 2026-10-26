import { afterEach, beforeEach, expect, it, mock } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { FULLY_REVEALED, nextStage } from '@ihsaanly/core/memorise/reveal'
import { en } from '@ihsaanly/core/strings/en'
import { act } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { renderScreen } from '../../../../../../../packages/ui/test/render'
import '../../../../../test/library'
import { router } from '../../../../../test/router'

type MemoriseProps = ComponentProps<typeof import('@ihsaanly/ui/screens/memorise').MemoriseScreen>

const screens: MemoriseProps[] = []
mock.module('@ihsaanly/ui/screens/memorise', () => ({
  MemoriseScreen: (props: MemoriseProps): ReactElement => {
    screens.push(props)
    return <div data-testid="memorise-screen" />
  },
}))

const audio = {
  playing: false,
  didJustFinish: false,
  sources: [] as unknown[],
  calls: [] as string[],
  player: {
    loop: undefined as boolean | undefined,
    play: () => {},
    pause: () => {},
    seekTo: async (_seconds: number) => {},
    setPlaybackRate: (_rate: number) => {},
  },
}
audio.player.play = () => void audio.calls.push('play')
audio.player.pause = () => void audio.calls.push('pause')
audio.player.seekTo = async (seconds) => void audio.calls.push(`seek:${seconds}`)
audio.player.setPlaybackRate = (rate) => void audio.calls.push(`rate:${rate}`)
mock.module('expo-audio', () => ({
  useAudioPlayer: (source: unknown) => {
    audio.sources.push(source)
    return audio.player
  },
  useAudioPlayerStatus: () => ({ playing: audio.playing, didJustFinish: audio.didJustFinish }),
}))

const { default: MemoriseRoute } = await import('../../../../app/(library)/item/memorise/[id]')
const { toggleKnown, getKnownItems } = await import('@ihsaanly/state/memorise/store')

const ID = 'tasbih-after-prayer'

const last = (): MemoriseProps => {
  const props = screens.at(-1)
  if (!props) throw new Error('MemoriseScreen did not render')
  return props
}

beforeEach(() => {
  screens.length = 0
  audio.playing = false
  audio.didJustFinish = false
  audio.sources.length = 0
  audio.calls.length = 0
  audio.player.loop = undefined
  router.params = { id: ID }
})

afterEach(() => {
  if (getKnownItems().includes(ID)) act(() => toggleKnown(ID))
})

it('shows Not found for an unknown item', () => {
  router.params = { id: 'no-such-item' }
  const { getByText, queryByTestId } = renderScreen(<MemoriseRoute />)
  expect(getByText(en.notFound.body)).toBeTruthy()
  expect(queryByTestId('memorise-screen')).toBeNull()
  expect(screens).toEqual([])
})

it('presents the item fully revealed, repeating without end at full speed, without audio', () => {
  renderScreen(<MemoriseRoute />)
  const item = itemById(ID)
  expect(last().arabic).toBe(item?.arabic ?? null)
  expect(last().reveal).toEqual(FULLY_REVEALED)
  expect(last().repeat).toBe('always')
  expect(last().speed).toBe(1)
  expect(audio.calls).toEqual(['rate:1'])
  expect(last().hasAudio).toBe(false)
  expect(last().known).toBe(false)
  expect(last().playing).toBe(false)
  expect(audio.sources.at(-1)).toBeNull()
  expect(audio.player.loop).toBe(true)
  expect(router.screens).toEqual([{ title: en.memorise.title }])
})

it('hides one more step each time', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onHideOne())
  expect(last().reveal).toEqual(nextStage(FULLY_REVEALED))
  expect(last().reveal).not.toEqual(FULLY_REVEALED)
})

it('repeats without end through the player loop, and a count by hand', () => {
  const { rerender } = renderScreen(<MemoriseRoute />)
  act(() => last().onRepeat(2))
  expect(last().repeat).toBe(2)
  expect(audio.player.loop).toBe(false)
  act(() => last().onTogglePlay())
  audio.calls.length = 0

  // The first play ends: once more from the start.
  audio.didJustFinish = true
  rerender(<MemoriseRoute />)
  expect(audio.calls).toEqual(['seek:0', 'play'])

  // The second ends: two plays, so it rests at the start.
  audio.didJustFinish = false
  rerender(<MemoriseRoute />)
  audio.didJustFinish = true
  rerender(<MemoriseRoute />)
  expect(audio.calls).toEqual(['seek:0', 'play', 'seek:0'])

  act(() => last().onRepeat('always'))
  expect(audio.player.loop).toBe(true)
  // Without end, a finish is the loop's to handle.
  audio.didJustFinish = false
  rerender(<MemoriseRoute />)
  audio.didJustFinish = true
  rerender(<MemoriseRoute />)
  expect(audio.calls).toEqual(['seek:0', 'play', 'seek:0'])
})

it('sets the chosen speed on the player', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onSpeed(0.5))
  expect(last().speed).toBe(0.5)
  expect(audio.calls).toEqual(['rate:1', 'rate:0.5'])
})

it('plays when stopped and pauses when playing', () => {
  renderScreen(<MemoriseRoute />)
  audio.calls.length = 0
  act(() => last().onTogglePlay())
  expect(audio.calls).toEqual(['play'])

  audio.playing = true
  renderScreen(<MemoriseRoute />)
  expect(last().playing).toBe(true)
  act(() => last().onTogglePlay())
  expect(audio.calls).toEqual(['play', 'rate:1', 'pause'])
})

it('marks the item known and unknown', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onToggleKnown())
  expect(last().known).toBe(true)
  expect(getKnownItems()).toContain(ID)
  act(() => last().onToggleKnown())
  expect(last().known).toBe(false)
})
