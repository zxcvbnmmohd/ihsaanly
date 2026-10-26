import { itemById, resolveText } from '@ihsaanly/core/content'
import { playAgain, type Repeat, type Speed } from '@ihsaanly/core/memorise/recitation'
import { FULLY_REVEALED, nextStage, type Reveal } from '@ihsaanly/core/memorise/reveal'
import { toggleKnown, useKnownItems } from '@ihsaanly/state/memorise/store'
import { useStrings } from '@ihsaanly/state/strings'
import { EmptyState } from '@ihsaanly/ui/components/empty-state'
import { MemoriseScreen } from '@ihsaanly/ui/screens/memorise'
import { createFileRoute } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { PageHeader } from '~/components/page-header'
import { useAudioPlayer, useAudioPlayerStatus } from '~/platform/audio'

export const Route = createFileRoute('/_library/item/memorise/$id')({ component: MemoriseRoute })

interface Thing {
  reveal: Reveal
  speed: Speed
  repeat: Repeat
  /** Plays finished since the last press of Play, to stop after `repeat` of them. */
  plays: number
}

function MemoriseRoute(): ReactElement {
  const strings = useStrings()
  const { id } = Route.useParams()
  const item = itemById(id)
  const known = useKnownItems()
  const [thing, setThing] = useState<Thing>({
    reveal: FULLY_REVEALED,
    speed: 1,
    repeat: 'always',
    plays: 0,
  })

  // No recitations exist yet, so this stays null until they do.
  const player = useAudioPlayer(item?.audio ?? null)
  const status = useAudioPlayerStatus(player)

  useEffect(() => {
    // Without end is the player's own loop; a count is replayed by hand below.
    player.loop = thing.repeat === 'always'
  }, [player, thing.repeat])

  useEffect(() => {
    player.setPlaybackRate(thing.speed)
  }, [player, thing.speed])

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per finished play, not whenever the count changes.
  useEffect(() => {
    if (!status.didJustFinish || thing.repeat === 'always') return
    const plays = thing.plays + 1
    const again = playAgain(thing.repeat, plays)
    setThing((current) => ({ ...current, plays: again ? plays : 0 }))
    void player.seekTo(0)
    if (again) player.play()
  }, [status.didJustFinish])

  const togglePlay = (): void => {
    if (status.playing) {
      player.pause()
      return
    }
    setThing((current) => ({ ...current, plays: 0 }))
    player.play()
  }

  if (!item)
    return (
      <>
        <PageHeader title={strings.notFound.title} />
        <EmptyState message={strings.notFound.body} />
      </>
    )

  return (
    <>
      <PageHeader title={strings.memorise.title} />
      <MemoriseScreen
        arabic={item.arabic}
        transliteration={resolveText(item.transliteration)}
        translation={resolveText(item.translation)}
        reveal={thing.reveal}
        known={known.includes(item.id)}
        hasAudio={item.audio !== null}
        playing={status.playing}
        speed={thing.speed}
        repeat={thing.repeat}
        onHideOne={() => setThing((current) => ({ ...current, reveal: nextStage(current.reveal) }))}
        onTogglePlay={togglePlay}
        onSpeed={(speed) => setThing((current) => ({ ...current, speed }))}
        onRepeat={(repeat) => setThing((current) => ({ ...current, repeat, plays: 0 }))}
        onToggleKnown={() => toggleKnown(item.id)}
      />
    </>
  )
}
