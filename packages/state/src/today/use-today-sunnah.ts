import { itemById, resolveText } from '@ihsaanly/core/content'
import type { Plan, PlannedItem } from '@ihsaanly/core/plan/signals'
import { markFor, markKind, panelFor, split, toEntry, toNext } from '@ihsaanly/ui/props/today'
import type { TodayEntry, TodayScreenProps } from '@ihsaanly/ui/screens/today'
import { TOUR_STEPS, type TourStep } from '@ihsaanly/ui/types'
import { useState } from 'react'
import { useOnboarding } from '../onboarding/store'
import { useCompletedToday } from '../plan/completions'
import { resumeTracking, snoozeCheckIn } from '../plan/user-state-store'
import {
  addCount,
  completeIfFinished,
  getItemProgress,
  markAllDone,
  setPartDone,
  unmarkItem,
  useProgressRevision,
} from '../progress/store'
import type { Strings } from '../strings'
import {
  notePrayerMarked as countPrayerMark,
  PRAYER_HINT_MARKS,
  setTourSeen,
  useTodayHints,
} from './hints'

export interface TodaySunnahOptions {
  planned: Plan | null
  strings: Strings
  now: Date
  timeZone: string
  /** `?tour=1` (More → Show me around): show the tour again from the start. */
  replayTour: boolean
  /** The tour ended (Skip or its last step): the route drops `?tour=1`. */
  onTourEnd: () => void
  /** Whether the first-run tour may start; defaults to onboarding being done. The extension has no onboarding. */
  onboarded?: boolean
}

/** Everything on Today about sunnah rows, marking them, and teaching the screen. */
export type TodaySunnah = Pick<
  TodayScreenProps,
  | 'now'
  | 'next'
  | 'allDay'
  | 'tomorrow'
  | 'later'
  | 'doneToday'
  | 'onCircle'
  | 'undo'
  | 'onDismissUndo'
  | 'panel'
  | 'onClosePanel'
  | 'onCount'
  | 'onComplete'
  | 'onMarkAll'
  | 'onTogglePart'
  | 'prayerHint'
  | 'tour'
  | 'paused'
  | 'checkIn'
> & {
  /** The route marked a prayer (not unmarked): the hint counts it, the tour moves on. */
  notePrayerMarked: () => void
}

interface Thing {
  undo: { itemId: string; title: string; seq: number } | null
  panelItemId: string | null
  tour: { step: TourStep; ended: boolean; replay: boolean }
}

/**
 * The Today route's sunnah half, shared by every app: rows with their circles,
 * what a circle press means, the undo bar, the counter and parts sheets, the
 * prayer hint, the first-run tour and the pause. Marks go through the progress
 * store, so the app must have called `startProgress()` once.
 */
export function useTodaySunnah({
  planned,
  strings,
  now,
  timeZone,
  replayTour,
  onTourEnd,
  onboarded,
}: TodaySunnahOptions): TodaySunnah {
  const [thing, setThing] = useState<Thing>({
    undo: null,
    panelItemId: null,
    tour: { step: 0, ended: false, replay: replayTour },
  })
  const completed = useCompletedToday(timeZone, now)
  const hints = useTodayHints()
  const onboarding = useOnboarding()
  useProgressRevision()

  // Show me around again, after a tour that already ended here.
  if (replayTour !== thing.tour.replay) {
    setThing((current) => ({
      ...current,
      tour: replayTour
        ? { step: 0, ended: false, replay: true }
        : { ...current.tour, replay: false },
    }))
  }

  const today = planned?.today
  const ahead = split(today?.comingUp ?? [])
  const open = new Set([...(today?.now ?? []), ...ahead.allDay].map((entry) => entry.itemId))
  const doneIds = new Set((today?.done ?? []).map((entry) => entry.itemId))
  const isDone = (id: string): boolean =>
    doneIds.has(id) || (completed[id] !== undefined && !open.has(id))

  const withMark = (entry: TodayEntry): TodayEntry => {
    const item = itemById(entry.id)
    return item
      ? { ...entry, mark: markFor(item, isDone(entry.id), getItemProgress(entry.id)) }
      : entry
  }
  const entries = (list: PlannedItem[], showWhen = true): TodayEntry[] =>
    list.flatMap((entry) => toEntry(entry, strings, itemById, showWhen) ?? [])

  const next = toNext(today?.next ?? null, now, strings, itemById)

  const finished = (itemId: string): void => {
    const item = itemById(itemId)
    setThing((current) => ({
      ...current,
      panelItemId: current.panelItemId === itemId ? null : current.panelItemId,
      undo: {
        itemId,
        title: item ? (resolveText(item.title) ?? itemId) : itemId,
        seq: (current.undo?.seq ?? 0) + 1,
      },
    }))
  }

  const unmark = (itemId: string): void => {
    unmarkItem(itemId)
    setThing((current) => ({
      ...current,
      undo: current.undo?.itemId === itemId ? null : current.undo,
    }))
  }

  const onCircle = (id: string): void => {
    const item = itemById(id)
    if (!item) return
    if (isDone(id)) {
      unmark(id)
      return
    }
    if (markKind(item) === 'once') {
      markAllDone(id)
      finished(id)
      return
    }
    setThing((current) => ({ ...current, panelItemId: id }))
  }

  const finishIfDone = (itemId: string): void => {
    const item = itemById(itemId)
    if (item && completeIfFinished(itemId, item)) finished(itemId)
  }

  const panelItem = thing.panelItemId ? itemById(thing.panelItemId) : undefined
  const panel = panelItem ? panelFor(panelItem, getItemProgress(panelItem.id)) : null

  const tourShowing =
    !thing.tour.ended && (replayTour || ((onboarded ?? onboarding.completed) && !hints.tourSeen))
  const endTour = (): void => {
    setTourSeen()
    setThing((current) => ({ ...current, tour: { ...current.tour, ended: true } }))
    onTourEnd()
  }

  const undo = thing.undo
  const paused = (today?.pausedNotice ?? null) !== null

  // A ticked up-next row moves to Done today like any other.
  const nextBefore = next?.before.map(withMark) ?? []
  const nextAfter = next?.after.map(withMark) ?? []
  const ticked = (entry: TodayEntry): boolean => entry.mark?.done === true
  const doneEarly = [...nextBefore, ...nextAfter].filter(ticked)
  const doneLater = entries(
    (today?.done ?? []).filter((entry) => entry.reason !== 'upcoming'),
    false,
  ).filter((entry) => !doneEarly.some((early) => early.id === entry.id))

  return {
    now: entries(today?.now ?? []).map(withMark),
    next: next
      ? {
          ...next,
          before: nextBefore.filter((entry) => !ticked(entry)),
          after: nextAfter.filter((entry) => !ticked(entry)),
        }
      : null,
    allDay: entries(ahead.allDay, false).map(withMark),
    tomorrow: entries(ahead.tomorrow, false),
    later: entries(ahead.later),
    doneToday: [...doneLater, ...doneEarly].map((entry) => ({
      ...entry,
      mark: { done: true, progress: null },
    })),
    onCircle,
    undo: undo
      ? {
          id: `${undo.itemId}#${undo.seq}`,
          title: undo.title,
          onUndo: () => unmark(undo.itemId),
        }
      : null,
    onDismissUndo: () => setThing((current) => ({ ...current, undo: null })),
    panel,
    onClosePanel: () => setThing((current) => ({ ...current, panelItemId: null })),
    onCount: (itemId) => {
      addCount(itemId)
      finishIfDone(itemId)
    },
    onComplete: (itemId) => {
      if (!isDone(itemId)) markAllDone(itemId)
      finished(itemId)
    },
    onMarkAll: (itemId) => {
      markAllDone(itemId)
      finished(itemId)
    },
    onTogglePart: (itemId, partId) => {
      setPartDone(itemId, partId, !getItemProgress(itemId).parts.includes(partId))
      finishIfDone(itemId)
    },
    prayerHint: !paused && hints.prayersMarked < PRAYER_HINT_MARKS,
    tour: tourShowing
      ? {
          step: thing.tour.step,
          onNext: () => {
            if (thing.tour.step + 1 >= TOUR_STEPS) {
              endTour()
              return
            }
            setThing((current) => ({
              ...current,
              tour: { ...current.tour, step: (current.tour.step + 1) as TourStep },
            }))
          },
          onSkip: endTour,
        }
      : null,
    paused,
    checkIn: today?.checkInDue
      ? { onResume: resumeTracking, onNotYet: () => snoozeCheckIn(now) }
      : null,
    notePrayerMarked: () => {
      countPrayerMark()
      if (tourShowing && thing.tour.step === 0) {
        setThing((current) => ({ ...current, tour: { ...current.tour, step: 1 } }))
      }
    },
  }
}
