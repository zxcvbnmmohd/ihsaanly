import type { Href } from 'expo-router'

import { useHijriOffset } from '@/hijri/store'
import { supportedLanguageOf } from '@/i18n/locale'
import { useLocale } from '@/i18n/store'
import { usePlace } from '@/location/store'
import { useUserState } from '@/plan/user-state-store'
import { useQada } from '@/prayer/marks'
import { useCalculationPreferences } from '@/prayer/store'
import { useStrings } from '@/strings'
import { useThemePreference } from '@/theme/store'

export interface MoreRow {
  href: Href
  title: string
  detail: string | null
}

export interface MoreGroup {
  title: string
  rows: MoreRow[]
}

/**
 * The settings list as data, so More can render it and Search can look through
 * it. One place decides what a row is called and what it currently says.
 */
export function useMoreGroups(): MoreGroup[] {
  const strings = useStrings()
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const userState = useUserState()
  const locale = useLocale()
  const theme = useThemePreference()
  const owed = Object.values(useQada()).reduce((sum, count) => sum + (count ?? 0), 0)

  const tracking = [
    userState.travelling ? strings.tracking.travelling : null,
    userState.trackingPaused ? strings.tracking.paused : null,
  ].filter(Boolean)

  return [
    {
      title: strings.more.prayer,
      rows: [
        {
          href: '/location',
          title: strings.location.title,
          detail: place?.label ?? strings.location.notSet,
        },
        {
          href: '/calculation',
          title: strings.calculation.title,
          detail: strings.asr[calculation.asr],
        },
        {
          href: '/hijri',
          title: strings.hijri.title,
          detail: strings.hijri.offsetLabel(hijriOffset),
        },
      ],
    },
    {
      title: strings.more.app,
      rows: [
        { href: '/notifications', title: strings.notifications.title, detail: null },
        {
          href: '/tracking',
          title: strings.tracking.title,
          detail: tracking.length > 0 ? tracking.join(', ') : strings.tracking.active,
        },
        { href: '/events', title: strings.events.title, detail: null },
        {
          href: '/language',
          title: strings.language.title,
          detail: strings.language.names[supportedLanguageOf(locale)],
        },
        { href: '/appearance', title: strings.appearance.title, detail: strings.appearance[theme] },
        { href: '/about', title: strings.about.title, detail: null },
      ],
    },
    {
      title: strings.more.practice,
      rows: [
        { href: '/history', title: strings.history.title, detail: null },
        {
          href: '/qada',
          title: strings.qada.title,
          detail: owed > 0 ? strings.qada.summary(owed) : strings.qada.none,
        },
        { href: '/data', title: strings.data.title, detail: null },
      ],
    },
  ]
}

/** Rows whose title or current value contains the query; groups left empty are dropped. */
export function filterGroups(groups: MoreGroup[], query: string): MoreGroup[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return groups
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) =>
        [row.title, row.detail ?? ''].some((text) => text.toLocaleLowerCase().includes(needle)),
      ),
    }))
    .filter((group) => group.rows.length > 0)
}
