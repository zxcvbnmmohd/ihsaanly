export interface CivilDate {
  year: number;
  month: number;
  day: number;
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
export function civilDateIn(instant: Date, timeZone: string): CivilDate {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instant)
    .split('-')
    .map(Number);

  return { year: year!, month: month!, day: day! };
}

export function shiftDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day));
  shifted.setUTCDate(shifted.getUTCDate() + days);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function logDay(instant: Date, timeZone: string): CivilDate {
  return civilDateIn(instant, timeZone);
}

export function hijriDay(instant: Date, maghrib: Date, timeZone: string): CivilDate {
  const civil = civilDateIn(instant, timeZone);
  return instant >= maghrib ? shiftDays(civil, 1) : civil;
}

export function isSameCivilDate(left: CivilDate, right: CivilDate): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}
