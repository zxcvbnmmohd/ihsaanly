import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState, type ReactElement } from 'react'

import { EmptyState } from '@/components/empty-state'
import { itemById, resolveText } from '@/content'
import { FULLY_REVEALED, nextStage, type Reveal } from '@/memorise/reveal'
import { toggleKnown, useKnownItems } from '@/memorise/store'
import { MemoriseScreen } from '@/screens/memorise'
import { strings } from '@/strings'

interface Thing {
  reveal: Reveal
  looping: boolean
}

export default function MemoriseRoute(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemById(id)
  const known = useKnownItems()
  const [thing, setThing] = useState<Thing>({ reveal: FULLY_REVEALED, looping: true })

  // No recitations exist yet, so this stays null until they do.
  const player = useAudioPlayer(item?.audio ?? null)
  const status = useAudioPlayerStatus(player)

  useEffect(() => {
    // expo-audio exposes `loop` as a settable property; that is its API, and
    // the compiler's immutability rule cannot know that.
    // eslint-disable-next-line react-hooks/immutability
    player.loop = thing.looping
  }, [player, thing.looping])

  if (!item) return <EmptyState message={strings.notFound.body} />

  return (
    <>
      <Stack.Screen options={{ title: strings.memorise.title }} />
      <MemoriseScreen
        arabic={item.arabic}
        transliteration={resolveText(item.transliteration)}
        translation={resolveText(item.translation)}
        reveal={thing.reveal}
        known={known.includes(item.id)}
        hasAudio={item.audio !== null}
        playing={status.playing}
        looping={thing.looping}
        onHideOne={() => setThing((current) => ({ ...current, reveal: nextStage(current.reveal) }))}
        onTogglePlay={() => (status.playing ? player.pause() : player.play())}
        onToggleLoop={() => setThing((current) => ({ ...current, looping: !current.looping }))}
        onToggleKnown={() => toggleKnown(item.id)}
      />
    </>
  )
}
