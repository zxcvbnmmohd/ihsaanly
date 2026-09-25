import { assertNever } from '@/assert-never'
import { civilDateIn, weekdayOf } from '@/day/boundaries'
import type { WindowName } from '@/prayer/windows'
import type { Strings } from '@/strings/en'

import type { DayContext, Prayer } from './signals'
import type { JumuahChoice } from './user-state'

/**
 * On Fridays, Jumu'ah replaces Dhuhr for those who pray it. Marks, storage and
 * the `Prayer` type never change: Jumu'ah is recorded as the dhuhr mark and a
 * missed one is made up as Dhuhr. What changes is the name, and which content
 * applies (see `resolveTriggerPrayer`).
 */

/** The onboarding answer, spelled out here so the domain never imports the store. */
export type JumuahGender = 'female' | 'male' | 'unspecified'

/** 0 = Sunday, as `DayContext.weekday` and `Date#getDay` count. */
const FRIDAY = 5

/**
 * `auto` means Jumu'ah unless the user is travelling or answered Sister at
 * onboarding; neither is obliged to attend. An explicit choice always wins.
 */
export function attendsJumuah(
  choice: JumuahChoice,
  travelling: boolean,
  gender: JumuahGender,
): boolean {
  switch (choice) {
    case 'attend':
      return true
    case 'dhuhr':
      return false
    case 'auto':
      return !travelling && gender !== 'female'
    default:
      return assertNever(choice)
  }
}

/**
 * Jumu'ah is the midday prayer of the civil Friday. The Hijri day turns at
 * Maghrib, but no Dhuhr falls between a Thursday Maghrib and midnight, so the
 * civil weekday is the one that decides.
 */
export function isJumuahDay(day: Pick<DayContext, 'weekday'>, attends: boolean): boolean {
  return attends && day.weekday === FRIDAY
}

/** The same question for an instant, where no DayContext exists: a window start, a widget entry. */
export function isJumuahAt(instant: Date, timeZone: string, attends: boolean): boolean {
  return isJumuahDay({ weekday: weekdayOf(civilDateIn(instant, timeZone)) }, attends)
}

/**
 * The prayer a content trigger answers to on a given day, or null when it does
 * not apply that day. A `dhuhr` trigger steps aside on a Jumu'ah day and a
 * `jumuah` one stands in for it, against the dhuhr mark and the dhuhr window;
 * `any` always applies.
 */
export function resolveTriggerPrayer(
  prayer: Prayer | 'jumuah' | 'any',
  jumuah: boolean,
): Prayer | 'any' | null {
  if (prayer === 'jumuah') return jumuah ? 'dhuhr' : null
  if (prayer === 'dhuhr') return jumuah ? null : 'dhuhr'
  return prayer
}

/** The name of a prayer on the day in question. Every call site that names a prayer goes through here. */
export function prayerName(
  strings: Pick<Strings, 'prayer'>,
  prayer: Prayer,
  jumuah: boolean,
): string {
  return prayer === 'dhuhr' && jumuah ? strings.prayer.jumuah : strings.prayer[prayer]
}

/** All five names for one day, for a strip or a list that takes a record. */
export function prayerNames(
  strings: Pick<Strings, 'prayer'>,
  jumuah: boolean,
): Record<Prayer, string> {
  return {
    fajr: strings.prayer.fajr,
    dhuhr: prayerName(strings, 'dhuhr', jumuah),
    asr: strings.prayer.asr,
    maghrib: strings.prayer.maghrib,
    isha: strings.prayer.isha,
  }
}

/** The name of a window on the day in question: "After Jumu'ah" in place of "After Dhuhr". */
export function windowName(
  strings: Pick<Strings, 'window'>,
  window: WindowName,
  jumuah: boolean,
): string {
  return window === 'dhuhr' && jumuah ? strings.window.jumuah : strings.window[window]
}
