import { items } from '@ihsaanly/core/content'
import { civilDateIn, civilDateKey, shiftDays } from '@ihsaanly/core/day/boundaries'
import { checkInDate } from '@ihsaanly/core/plan/check-in'
import { DEFAULT_USER_STATE, UserState } from '@ihsaanly/core/plan/user-state'
import { z } from 'zod'
import { getPlace } from '../location/store'
import { createPreferenceStore } from '../storage/preference-store'
import { getEnabledItems, setEnabledItems } from './enabled-store'

const store = createPreferenceStore('userState', UserState, DEFAULT_USER_STATE)

export const setUserState = store.set
export const useUserState = store.use
export const getUserState = store.get

/**
 * The pause's own items this device has already switched on once. Someone who
 * installed before they existed never got them by default; the first pause
 * turns them on, and after that their choice stands. Local on purpose: at
 * worst another device offers them once more.
 */
const offered = createPreferenceStore('pauseItemsOffered', z.array(z.string()), [])

function today(now: Date): ReturnType<typeof civilDateIn> {
  const timeZone = getPlace()?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  return civilDateIn(now, timeZone)
}

function offerPauseItems(): void {
  const already = new Set(offered.get())
  const fresh = items
    .filter((item) => item.onlyWhilePaused && item.defaultOn && !already.has(item.id))
    .map((item) => item.id)
  if (fresh.length === 0) return

  const enabled = getEnabledItems()
  setEnabledItems([...enabled, ...fresh.filter((id) => !enabled.includes(id))])
  offered.set([...already, ...fresh])
}

/**
 * Pauses prayer tracking. `checkInDays` is "remind me in about N days",
 * held to 3–10; null asks for no check-in. Only the user ever resumes.
 */
export function pauseTracking(
  { checkInDays }: { checkInDays: number | null },
  now = new Date(),
): void {
  offerPauseItems()
  setUserState({
    ...getUserState(),
    trackingPaused: true,
    pauseCheckInOn: checkInDays === null ? null : checkInDate(today(now), checkInDays),
  })
}

/** Resumes tracking, and with it any check-in still pending. */
export function resumeTracking(): void {
  setUserState({ ...getUserState(), trackingPaused: false, pauseCheckInOn: null })
}

/** "Not yet": asks again tomorrow. */
export function snoozeCheckIn(now = new Date()): void {
  setUserState({ ...getUserState(), pauseCheckInOn: civilDateKey(shiftDays(today(now), 1)) })
}
