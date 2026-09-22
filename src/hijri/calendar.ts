import umalqura from '@umalqura/core'

import { shiftDays, type CivilDate } from '@/day/boundaries'

export const MINIMUM_OFFSET = -2
export const MAXIMUM_OFFSET = 2

export interface HijriDate {
  year: number
  month: number
  day: number
}

/**
 * The offset exists because a calculated calendar and local moon sighting
 * routinely disagree by a day or two. It shifts the civil date before
 * conversion, which is how a user matches the app to their own community.
 */
export function toHijri(civil: CivilDate, offsetDays = 0): HijriDate {
  const adjusted = shiftDays(civil, offsetDays)
  const converted = umalqura(new Date(Date.UTC(adjusted.year, adjusted.month - 1, adjusted.day)))

  return { year: converted.hy, month: converted.hm, day: converted.hd }
}

export function offsetOptions(): number[] {
  return Array.from(
    { length: MAXIMUM_OFFSET - MINIMUM_OFFSET + 1 },
    (_, index) => MINIMUM_OFFSET + index,
  )
}
