// A minimal stand-in for expo-audio's `useAudioPlayer`/`useAudioPlayerStatus`,
// backed by a plain `<audio>` element — Vite has no native module to reach
// for. No item ships a recitation yet (`item.audio` is always null), so this
// only has to be correct, not exhaustive.
import { useEffect, useMemo, useRef, useState } from 'react'

export interface AudioPlayer {
  element: HTMLAudioElement | null
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => Promise<void>
  setPlaybackRate: (rate: number) => void
  loop: boolean
}

export function useAudioPlayer(source: string | null): AudioPlayer {
  const ref = useRef<HTMLAudioElement | null>(null)
  if (ref.current === null && source) ref.current = new Audio(source)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuilds only when the element identity changes, not on every render.
  return useMemo(
    () => ({
      element: ref.current,
      play: (): void => void ref.current?.play(),
      pause: (): void => ref.current?.pause(),
      seekTo: async (seconds: number): Promise<void> => {
        if (ref.current) ref.current.currentTime = seconds
      },
      setPlaybackRate: (rate: number): void => {
        if (ref.current) ref.current.playbackRate = rate
      },
      get loop(): boolean {
        return ref.current?.loop ?? false
      },
      set loop(value: boolean) {
        if (ref.current) ref.current.loop = value
      },
    }),
    [ref.current],
  )
}

interface Thing {
  playing: boolean
  /** True from the moment a play reaches its end until the next one starts, as in expo-audio. */
  didJustFinish: boolean
}

export function useAudioPlayerStatus(player: AudioPlayer): Thing {
  const [thing, setThing] = useState<Thing>({ playing: false, didJustFinish: false })

  useEffect(() => {
    const element = player.element
    if (!element) return undefined
    const onPlay = (): void => setThing({ playing: true, didJustFinish: false })
    const onPause = (): void => setThing((current) => ({ ...current, playing: false }))
    const onEnded = (): void => setThing({ playing: false, didJustFinish: true })
    element.addEventListener('play', onPlay)
    element.addEventListener('pause', onPause)
    element.addEventListener('ended', onEnded)
    return (): void => {
      element.removeEventListener('play', onPlay)
      element.removeEventListener('pause', onPause)
      element.removeEventListener('ended', onEnded)
    }
  }, [player.element])

  return thing
}
