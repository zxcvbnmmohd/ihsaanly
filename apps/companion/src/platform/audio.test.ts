import { afterEach, beforeEach, expect, it } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useAudioPlayer, useAudioPlayerStatus } from './audio'

class FakeAudio extends EventTarget {
  static created: FakeAudio[] = []
  loop = false
  currentTime = 7
  playbackRate = 1
  calls: string[] = []
  constructor(readonly source: string) {
    super()
    FakeAudio.created.push(this)
  }
  play(): Promise<void> {
    this.calls.push('play')
    return Promise.resolve()
  }
  pause(): void {
    this.calls.push('pause')
  }
}

const originalAudio = globalThis.Audio

beforeEach(() => {
  FakeAudio.created = []
  globalThis.Audio = FakeAudio as unknown as typeof Audio
})

afterEach(() => {
  globalThis.Audio = originalAudio
})

it('with no recitation there is no element and every control is a no-op', () => {
  const { result } = renderHook(() => useAudioPlayer(null))
  expect(result.current.element).toBeNull()
  expect(FakeAudio.created).toHaveLength(0)
  result.current.play()
  result.current.pause()
  result.current.loop = true
  expect(result.current.loop).toBe(false)
  result.current.setPlaybackRate(0.5)
  void result.current.seekTo(0)
})

it('plays, pauses, loops, seeks and sets the speed of one <audio> element', async () => {
  const { result, rerender } = renderHook(() => useAudioPlayer('/dua.mp3'))
  const element = FakeAudio.created[0]
  expect(element?.source).toBe('/dua.mp3')
  expect(result.current.element as unknown).toBe(element)

  result.current.play()
  result.current.pause()
  expect(element?.calls).toEqual(['play', 'pause'])

  result.current.loop = true
  expect(element?.loop).toBe(true)
  expect(result.current.loop).toBe(true)

  result.current.setPlaybackRate(0.75)
  expect(element?.playbackRate).toBe(0.75)
  await result.current.seekTo(0)
  expect(element?.currentTime).toBe(0)

  rerender()
  expect(FakeAudio.created).toHaveLength(1)
})

it('the status follows the element and stops listening on unmount', () => {
  const element = new FakeAudio('/dua.mp3')
  const player = {
    element: element as unknown as HTMLAudioElement,
    play: () => {},
    pause: () => {},
    seekTo: async () => {},
    setPlaybackRate: () => {},
    loop: false,
  }
  const { result, unmount } = renderHook(() => useAudioPlayerStatus(player))
  expect(result.current.playing).toBe(false)

  act(() => void element.dispatchEvent(new Event('play')))
  expect(result.current.playing).toBe(true)
  act(() => void element.dispatchEvent(new Event('pause')))
  expect(result.current.playing).toBe(false)
  act(() => void element.dispatchEvent(new Event('ended')))
  expect(result.current).toEqual({ playing: false, didJustFinish: true })
  act(() => void element.dispatchEvent(new Event('play')))
  expect(result.current).toEqual({ playing: true, didJustFinish: false })
  act(() => void element.dispatchEvent(new Event('pause')))

  unmount()
  element.dispatchEvent(new Event('play'))
  expect(result.current.playing).toBe(false)
})

it('the status of a player without an element is never playing', () => {
  const player = {
    element: null,
    play: () => {},
    pause: () => {},
    seekTo: async () => {},
    setPlaybackRate: () => {},
    loop: false,
  }
  const { result } = renderHook(() => useAudioPlayerStatus(player))
  expect(result.current.playing).toBe(false)
})
