// Sample props for each component extracted from `screens/today.tsx`. Every
// value here is derived from `todayFixture` (`../screens/fixtures`) rather
// than duplicated, so the two stay in sync as Today's fixture changes.

import { prayerNames } from '@ihsaanly/core/plan/jumuah'
import { en } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { todayFixture } from '../screens/fixtures'
import type { AgendaListProps } from './agenda-list'
import type { MakeUpRowsProps } from './make-up-rows'
import type { PrayerStripProps } from './prayer-strip'
import type { RightNowCardProps } from './right-now-card'
import type { SectionProps } from './section'
import type { SuggestionCardProps } from './suggestion-card'
import type { UpNextCardProps } from './up-next-card'

const noop = (): void => {}

function firstOf<T>(list: T[], label: string): T {
  const [item] = list
  if (!item) throw new Error(`todayFixture.${label} is empty`)
  return item
}

function must<T>(value: T | null, label: string): T {
  if (!value) throw new Error(`todayFixture.${label} is missing`)
  return value
}

export const sectionFixture: SectionProps = {
  title: en.plan.rightNow,
  children: 'Example content',
}

export const prayerStripFixture: PrayerStripProps = {
  prayers: todayFixture.prayers,
  names: prayerNames(en, todayFixture.jumuah),
  onMark: noop,
}

export const rightNowCardFixture: RightNowCardProps = {
  entry: firstOf(todayFixture.now, 'now'),
}

const nextFixture = must(todayFixture.next, 'next')

export const upNextCardFixture: UpNextCardProps = {
  next: nextFixture,
  names: prayerNames(en, nextFixture.jumuah),
}

export const suggestionCardFixture: SuggestionCardProps = {
  entry: must(todayFixture.suggestion, 'suggestion'),
  palette: palettes.light,
  onAdd: noop,
  onDismiss: noop,
}

export const makeUpRowsFixture: MakeUpRowsProps = {
  qada: todayFixture.qada,
  qadaHref: todayFixture.qadaHref,
  onMakeUp: noop,
  fastsOwed: todayFixture.fastsOwed,
  fastingToday: todayFixture.fastingToday,
  onRecordFastOwed: noop,
  onUndoFastOwed: noop,
}

export const agendaListFixture: AgendaListProps = {
  title: en.plan.alsoToday,
  entries: todayFixture.allDay,
}
