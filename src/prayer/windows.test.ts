import { describe, expect, it } from 'bun:test';

import type { Place } from '@/location/place';

import { DEFAULT_CALCULATION_PREFERENCES } from './calculation';
import { prayerTimesAcross, prayerTimesFor } from './times';
import { buildWindows, windowAt, WINDOW_ORDER } from './windows';

const toronto: Place = {
  label: 'Toronto, Ontario, Canada',
  latitude: 43.7,
  longitude: -79.42,
  timezone: 'America/Toronto',
  source: 'city',
};

const tromso: Place = {
  label: 'Tromsø, Norway',
  latitude: 69.65,
  longitude: 18.96,
  timezone: 'Europe/Oslo',
  source: 'city',
};

const windowsAround = (place: Place, date: Date) =>
  buildWindows(prayerTimesAcross(place, date, DEFAULT_CALCULATION_PREFERENCES));

describe('prayer times', () => {
  it('produces every window in ascending order', () => {
    const times = prayerTimesFor(toronto, new Date('2026-09-17T12:00:00Z'), {
      ...DEFAULT_CALCULATION_PREFERENCES,
    });

    const instants = WINDOW_ORDER.map((name) => times[name].getTime());
    expect(instants).toEqual([...instants].sort((a, b) => a - b));
  });

  it('places Asr later under the Hanafi opinion', () => {
    const date = new Date('2026-09-17T12:00:00Z');
    const standard = prayerTimesFor(toronto, date, DEFAULT_CALCULATION_PREFERENCES);
    const hanafi = prayerTimesFor(toronto, date, {
      ...DEFAULT_CALCULATION_PREFERENCES,
      asr: 'hanafi',
    });

    expect(hanafi.asr.getTime()).toBeGreaterThan(standard.asr.getTime());
  });

  it('still yields an Isha window in the far north in midsummer', () => {
    const midsummer = new Date('2026-06-21T12:00:00Z');
    const times = prayerTimesFor(tromso, midsummer, DEFAULT_CALCULATION_PREFERENCES);

    expect(Number.isNaN(times.isha.getTime())).toBe(false);
  });
});

describe('windows', () => {
  it('are contiguous and strictly increasing', () => {
    const windows = windowsAround(toronto, new Date('2026-09-17T12:00:00Z'));

    windows.forEach((window, index) => {
      expect(window.startsAt.getTime()).toBeLessThan(window.endsAt.getTime());
      const next = windows[index + 1];
      if (next) expect(window.endsAt.getTime()).toBe(next.startsAt.getTime());
    });
  });

  it('remain contiguous across a daylight-saving transition', () => {
    const springForward = new Date('2026-03-08T12:00:00Z');
    const windows = windowsAround(toronto, springForward);

    windows.forEach((window, index) => {
      const next = windows[index + 1];
      if (next) expect(window.endsAt.getTime()).toBe(next.startsAt.getTime());
    });
  });

  it('put an instant after midnight in the previous evening’s Isha', () => {
    const date = new Date('2026-09-17T12:00:00Z');
    const windows = windowsAround(toronto, date);
    const [, today] = prayerTimesAcross(toronto, date, DEFAULT_CALCULATION_PREFERENCES);

    const afterMidnight = new Date(today!.isha.getTime() + 4 * 60 * 60 * 1000);

    const localDay = (instant: Date) =>
      instant.toLocaleDateString('en-CA', { timeZone: toronto.timezone });

    expect(windowAt(afterMidnight, windows)?.name).toBe('isha');
    expect(localDay(afterMidnight)).not.toBe(localDay(today!.isha));
  });

  it('return nothing for an instant outside the built range', () => {
    const windows = windowsAround(toronto, new Date('2026-09-17T12:00:00Z'));
    expect(windowAt(new Date('2020-01-01T00:00:00Z'), windows)).toBeNull();
  });
});
