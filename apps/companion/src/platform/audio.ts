// A minimal stand-in for expo-audio's `useAudioPlayer`/`useAudioPlayerStatus`,
// backed by a plain `<audio>` element — Vite has no native module to reach
// for. No item ships a recitation yet (`item.audio` is always null), so this
// only has to be correct, not exhaustive.
import { useEffect, useMemo, useRef, useState } from 'react'

export interface AudioPlayer {
  element: HTMLAudioElement | null
  play: () => void
  pause: () => void
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
}

export function useAudioPlayerStatus(player: AudioPlayer): { playing: boolean } {
  const [thing, setThing] = useState<Thing>({ playing: false })

  useEffect(() => {
    const element = player.element
    if (!element) return undefined
    const onPlay = (): void => setThing({ playing: true })
    const onPause = (): void => setThing({ playing: false })
    element.addEventListener('play', onPlay)
    element.addEventListener('pause', onPause)
    return (): void => {
      element.removeEventListener('play', onPlay)
      element.removeEventListener('pause', onPause)
    }
  }, [player.element])

  return thing
}
