export interface CivilDate {
  year: number
  month: number
  day: number
}

/**
 * Two day boundaries exist on purpose and must never be conflated.
 *
 * `logDay` is the local calendar day. It governs the prayer log, because a
 * history filed against the Islamic day would put Tuesday evening's Maghrib
 * and Isha under Wednesday, which nobody recognises as their own.
 *
 * `hijriDay` turns at Maghrib. It governs the Hijri date, fasting and every
 * date-based trigger.
 */
function partOf(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((candidate) => candidate.type === type)
  if (!part) throw new Error(`Formatted date is missing its ${type}`)
  return Number(part.value)
}

export function civilDateIn(instant: Date, timeZone: string): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)

  return { year: partOf(parts, 'year'), month: partOf(parts, 'month'), day: partOf(parts, 'day') }
}

export function shiftDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day))
  shifted.setUTCDate(shifted.getUTCDate() + days)

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/** 0 = Sunday, as `Date#getDay` counts. The date is read as a calendar day, never as an instant. */
export function weekdayOf(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

export function logDay(instant: Date, timeZone: string): CivilDate {
  return civilDateIn(instant, timeZone)
}

export function hijriDay(instant: Date, maghrib: Date, timeZone: string): CivilDate {
  const civil = civilDateIn(instant, timeZone)
  return instant >= maghrib ? shiftDays(civil, 1) : civil
}

export function isSameCivilDate(left: CivilDate, right: CivilDate): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day
}

/** Stable key for a civil day, used to file log entries against it. */
export function civilDateKey(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}
