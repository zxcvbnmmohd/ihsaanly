import { itemById, resolveText } from '@ihsaanly/core/content'
import { markCoachTourSeen, useCoachTourSeen } from '@ihsaanly/state/coach/tours'
import { usePlace } from '@ihsaanly/state/location/store'
import { useCompletedToday } from '@ihsaanly/state/plan/completions'
import { usePlan } from '@ihsaanly/state/plan/use-plan'
import {
  addCount,
  completeIfFinished,
  markAllDone,
  setPartDone,
  useItemProgress,
} from '@ihsaanly/state/progress/store'
import { useReaderPreferences } from '@ihsaanly/state/reader/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useNow } from '@ihsaanly/state/time/use-now'
import type { CounterState } from '@ihsaanly/ui/screens/item'
import {
  type ReaderCoach,
  type ReaderCoachTarget,
  type ReaderPage,
  ReaderScreen,
} from '@ihsaanly/ui/screens/reader'
import * as Haptics from 'expo-haptics'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { type ReactElement, useState } from 'react'

interface Thing {
  page: number
  /** Taps on each repeated part, this visit; a part is recorded once its count is reached. */
  partCounts: Record<string, number>
  /** Marked done here, so the counters stay full while the plan catches up. */
  finished: boolean
  /** The first-use tour: where it is, and whether it was finished or skipped here. */
  coachStep: number
  coachEnded: boolean
}

/**
 * The focused reader: what a reminder or widget opens for something to say.
 * Counting and parts go through the progress store, like Today's panel, so a
 * count started here carries on there and on another device.
 */
export default function ReaderRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({
    page: 0,
    partCounts: {},
    finished: false,
    coachStep: 0,
    coachEnded: false,
  })
  const coachSeen = useCoachTourSeen('reader')
  const strings = useStrings()
  const reader = useReaderPreferences()
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemById(id)
  const progress = useItemProgress(id)
  const place = usePlace()
  const now = useNow()
  const planned = usePlan()
  const completedToday = useCompletedToday(place?.timeZone ?? 'UTC', now)

  const title = item ? (resolveText(item.title) ?? item.id) : strings.notFound.title
  // Open in the plan means the completion, if any, belongs to an earlier occasion.
  const open = planned?.today.now.some((entry) => entry.itemId === id) ?? false
  const done = thing.finished || (completedToday[id] !== undefined && !open)

  const parts = item?.parts ?? []
  const pages: ReaderPage[] =
    parts.length > 0
      ? parts.map((part) => ({
          id: part.id,
          title: resolveText(part.title) ?? part.id,
          arabic: part.arabic,
          transliteration: resolveText(part.transliteration),
          translation: resolveText(part.translation),
        }))
      : item?.arabic
        ? [
            {
              id: item.id,
              title: null,
              arabic: item.arabic,
              transliteration: resolveText(item.transliteration),
              translation: resolveText(item.translation),
            },
          ]
        : []
  const part = parts[thing.page]

  const counter = ((): CounterState | null => {
    if (!item) return null
    if (part) {
      if (part.repeat <= 1) return null
      const said = done || progress.parts.includes(part.id)
      return { count: said ? part.repeat : (thing.partCounts[part.id] ?? 0), target: part.repeat }
    }
    if (item.repeat <= 1) return null
    return { count: done ? item.repeat : progress.count, target: item.repeat }
  })()

  // First use: tap to count (when there is a count), Done, More about this.
  const coachSteps: ReaderCoachTarget[] = counter ? ['counter', 'done', 'more'] : ['done', 'more']
  const coachStep = Math.min(thing.coachStep, coachSteps.length - 1)
  const coachTarget = coachSteps[coachStep]
  const endCoach = (): void => {
    markCoachTourSeen('reader')
    setThing((current) => ({ ...current, coachEnded: true }))
  }
  const nextCoach = (): void => {
    if (coachStep + 1 >= coachSteps.length) endCoach()
    else setThing((current) => ({ ...current, coachStep: coachStep + 1 }))
  }
  const coach: ReaderCoach | null =
    !coachSeen && !thing.coachEnded && pages.length > 0 && coachTarget
      ? {
          target: coachTarget,
          step: coachStep,
          total: coachSteps.length,
          onNext: nextCoach,
          onSkip: endCoach,
        }
      : null

  const finish = (): void => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setThing((current) => ({ ...current, finished: true }))
  }

  const tapCounter = (): void => {
    if (!item || !counter) return
    // The first count is the tip taken: the tour moves on to Done.
    if (coach?.target === 'counter') nextCoach()
    if (part) {
      const next = counter.count + 1
      setThing((current) => ({
        ...current,
        partCounts: { ...current.partCounts, [part.id]: next },
      }))
      if (next < part.repeat) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        return
      }
      setPartDone(item.id, part.id, true)
      if (completeIfFinished(item.id, item)) finish()
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return
    }
    addCount(item.id)
    if (completeIfFinished(item.id, item)) finish()
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  // Moving on from a part said once records it, as ticking it on Today would.
  const turnTo = (page: number): void => {
    if (item && part && page > thing.page && part.repeat <= 1 && !done) {
      setPartDone(item.id, part.id, true)
    }
    setThing((current) => ({ ...current, page }))
  }

  const close = (): void => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  const markDone = (): void => {
    if (item && !done) {
      markAllDone(item.id)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    close()
  }

  return (
    <>
      <Stack.Screen options={{ title, headerLargeTitleEnabled: false }} />
      <ReaderScreen
        title={title}
        pages={pages}
        page={thing.page}
        onPage={turnTo}
        counter={counter}
        onTapCounter={tapCounter}
        onDone={markDone}
        onMore={() => router.replace(`/item/${id}`)}
        coach={coach}
        reading={{ arabicFirst: reader.arabicFirst, align: reader.align }}
      />
    </>
  )
}
