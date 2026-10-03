// Pure "More screen" row-group building, shared by the app's More route and
// the marketing site's demo engine. The host reads its stores (place, prayer
// calculation, Hijri offset, tracking state, language, theme, qada) and hands
// the values over; this module only decides what each row says.

import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { MoreGroup, ThemePreference } from '../types'

/**
 * "Show me around" restarts the first-run tour on Today. A plain href, so a
 * host can follow it as a link or intercept it and start the tour itself.
 */
export const SHOW_ME_AROUND_HREF = '/today?tour=1'

export interface MoreGroupsInput {
  strings: Strings
  placeLabel: string | null
  asr: CalculationPreferences['asr']
  hijriOffset: number
  travelling: boolean
  trackingPaused: boolean
  language: SupportedLanguage
  theme: ThemePreference
  qadaOwed: number
  /**
   * The Account row's current value. Left out when the build has no cloud
   * config, and then there is no Account or Send feedback row: a local-only build never mentions accounts.
   */
  accountDetail?: string
}

/**
 * The settings list as data, so More can render it and Search can look
 * through it. One place decides what a row is called and what it currently
 * says.
 */
export function moreGroups(input: MoreGroupsInput): MoreGroup[] {
  const {
    strings,
    placeLabel,
    asr,
    hijriOffset,
    travelling,
    trackingPaused,
    language,
    theme,
    qadaOwed,
    accountDetail,
  } = input

  const tracking = [
    travelling ? strings.tracking.travelling : null,
    trackingPaused ? strings.tracking.paused : null,
  ].filter(Boolean)

  return [
    {
      title: strings.more.prayer,
      rows: [
        {
          href: '/location',
          title: strings.location.title,
          detail: placeLabel ?? strings.location.notSet,
        },
        {
          href: '/calculation',
          title: strings.calculation.title,
          detail: strings.asr[asr],
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
          detail: strings.language.names[language],
        },
        { href: '/appearance', title: strings.appearance.title, detail: strings.appearance[theme] },
        ...(accountDetail === undefined
          ? []
          : [{ href: '/feedback', title: strings.feedback.title, detail: null }]),
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
          detail: qadaOwed > 0 ? strings.qada.summary(qadaOwed) : strings.qada.none,
        },
        ...(accountDetail === undefined
          ? []
          : [{ href: '/account', title: strings.account.title, detail: accountDetail }]),
        { href: '/data', title: strings.data.title, detail: null },
      ],
    },
    {
      title: strings.more.help,
      rows: [{ href: SHOW_ME_AROUND_HREF, title: strings.more.showMeAround, detail: null }],
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
