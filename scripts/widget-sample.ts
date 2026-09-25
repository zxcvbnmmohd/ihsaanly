// Regenerates src/widgets/sample.json, the entry widgets show in the gallery
// before the app has published a timeline: `bun scripts/widget-sample.ts`.
import { writeFileSync } from 'node:fs'

import { items } from '../src/content'
import { dayContextFor } from '../src/plan/day-context'
import { attendsJumuah } from '../src/plan/jumuah'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../src/plan/notification-preferences'
import { DEFAULT_USER_STATE } from '../src/plan/user-state'
import { DEFAULT_CALCULATION_PREFERENCES } from '../src/prayer/calculation'
import { prayerTimesAcross } from '../src/prayer/times'
import { en } from '../src/strings/en'
import { widgetTimeline } from '../src/widgets/model'

const place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city' as const,
}
const now = new Date('2026-09-23T08:30:00Z')

const [sample] = widgetTimeline({
  signals: {
    now,
    timeZone: place.timeZone,
    items,
    prayerTimes: prayerTimesAcross(place, now, DEFAULT_CALCULATION_PREFERENCES, 3),
    today: dayContextFor(now, place.timeZone, 0, 0, null),
    upcoming: Array.from({ length: 7 }, (_, i) =>
      dayContextFor(now, place.timeZone, i + 1, 0, null),
    ),
    prayedToday: { fajr: new Date('2026-09-23T05:00:00Z') },
    completedToday: {},
    activeEvents: [],
    userState: DEFAULT_USER_STATE,
    attendsJumuah: attendsJumuah(
      DEFAULT_USER_STATE.jumuah,
      DEFAULT_USER_STATE.travelling,
      'unspecified',
    ),
    preferences: {
      enabledItemIds: items.filter((item) => item.defaultOn).map((item) => item.id),
      knownItemIds: [],
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  },
  strings: en,
  locale: 'en-GB',
  rtl: false,
  placeLabel: 'London',
  hijriOffset: 0,
  qada: { dhuhr: 1 },
  fastsOwed: 0,
})

writeFileSync('src/widgets/sample.json', JSON.stringify(sample, null, 2) + '\n')
