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
  sources: [] as unknown[],
  calls: [] as string[],
  player: { loop: undefined as boolean | undefined, play: () => {}, pause: () => {} },
}
audio.player.play = () => void audio.calls.push('play')
audio.player.pause = () => void audio.calls.push('pause')
mock.module('expo-audio', () => ({
  useAudioPlayer: (source: unknown) => {
    audio.sources.push(source)
    return audio.player
  },
  useAudioPlayerStatus: () => ({ playing: audio.playing }),
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

it('presents the item fully revealed, looping, without audio', () => {
  renderScreen(<MemoriseRoute />)
  const item = itemById(ID)
  expect(last().arabic).toBe(item?.arabic ?? null)
  expect(last().reveal).toEqual(FULLY_REVEALED)
  expect(last().looping).toBe(true)
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

it('toggles looping and tells the player', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onToggleLoop())
  expect(last().looping).toBe(false)
  expect(audio.player.loop).toBe(false)
  act(() => last().onToggleLoop())
  expect(last().looping).toBe(true)
  expect(audio.player.loop).toBe(true)
})

it('plays when stopped and pauses when playing', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onTogglePlay())
  expect(audio.calls).toEqual(['play'])

  audio.playing = true
  renderScreen(<MemoriseRoute />)
  expect(last().playing).toBe(true)
  act(() => last().onTogglePlay())
  expect(audio.calls).toEqual(['play', 'pause'])
})

it('marks the item known and unknown', () => {
  renderScreen(<MemoriseRoute />)
  act(() => last().onToggleKnown())
  expect(last().known).toBe(true)
  expect(getKnownItems()).toContain(ID)
  act(() => last().onToggleKnown())
  expect(last().known).toBe(false)
})
