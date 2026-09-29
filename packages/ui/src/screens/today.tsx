import type { HijriDate } from '@ihsaanly/core/hijri/calendar'
import { prayerNames } from '@ihsaanly/core/plan/jumuah'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { OnboardingArt } from '../components/onboarding-art'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { useUi } from '../provider'
import { AgendaList } from '../today/agenda-list'
import { MakeUpRows } from '../today/make-up-rows'
import { PrayerStrip } from '../today/prayer-strip'
import { RightNowCard } from '../today/right-now-card'
import { Section } from '../today/section'
import { SuggestionCard } from '../today/suggestion-card'
import { UpNextCard } from '../today/up-next-card'
import type { LocationProblem } from './onboarding'

export interface TodayEntry {
  id: string
  title: string
  detail: string | null
  href: string
}

export interface PrayerEntry {
  prayer: Prayer
  done: boolean
  /** Today's window for it has closed without a mark. */
  passed: boolean
}

export interface QadaEntry {
  prayer: Prayer
  count: number
}

/** Today's fast, offered only on a Ramadan day. */
export interface FastingTodayEntry {
  /** The user has already said they are not fasting today. */
  recorded: boolean
}

export interface NextPrayerEntry {
  prayer: Prayer
  /** It falls on the user's Jumu'ah day, so Dhuhr is named Jumu'ah. */
  jumuah: boolean
  distance: string
  before: TodayEntry[]
  after: TodayEntry[]
}

export interface SuggestionEntry {
  id: string
  title: string
  why: string | null
  href: string
}

export interface TodayScreenProps {
  hasLocation: boolean
  /** True while the device is being asked where it is, so the button can say so. */
  locating: boolean
  locationProblem: LocationProblem
  onUseMyLocation: () => void
  /** Today is the user's Jumu'ah day: the strip names Dhuhr Jumu'ah. Qada stays Dhuhr. */
  jumuah: boolean
  /** One item not yet on Today, offered at most weekly. */
  suggestion: SuggestionEntry | null
  onAddSuggestion: (id: string) => void
  onDismissSuggestion: (id: string) => void
  qadaHref: string
  /** Weekday, day and month in the reader's calendar, e.g. "Wed 23 Sep". */
  gregorian: string | null
  hijri: HijriDate | null
  placeLabel: string | null
  /** Everything open right now, best first. The head is the hero. */
  now: TodayEntry[]
  next: NextPrayerEntry | null
  allDay: TodayEntry[]
  tomorrow: TodayEntry[]
  later: TodayEntry[]
  prayers: PrayerEntry[]
  qada: QadaEntry[]
  onMarkPrayer: (prayer: Prayer) => void
  onMakeUp: (prayer: Prayer) => void
  /** Null outside Ramadan, and then the row is absent. */
  fastingToday: FastingTodayEntry | null
  /** Fasts still owed, all sources combined. */
  fastsOwed: number
  onRecordFastOwed: () => void
  onUndoFastOwed: () => void
  locationHref: string
}

export function TodayScreen({
  hasLocation,
  locating,
  locationProblem,
  onUseMyLocation,
  jumuah,
  suggestion,
  onAddSuggestion,
  onDismissSuggestion,
  qadaHref,
  gregorian,
  hijri,
  placeLabel,
  now,
  next,
  allDay,
  tomorrow,
  later,
  prayers,
  qada,
  onMarkPrayer,
  onMakeUp,
  fastingToday,
  fastsOwed,
  onRecordFastOwed,
  onUndoFastOwed,
  locationHref,
}: TodayScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const layout = useLayout()

  const [rightNow = null, ...alsoNow] = now
  const makeUp = qada.length > 0 || fastsOwed > 0 || fastingToday !== null

  // Location is set, the prayer strip is up, and nothing at all is asked of
  // the user. A screen that simply stops reads as a bug; one sentence does not.
  const nothingElse =
    !rightNow &&
    alsoNow.length === 0 &&
    allDay.length === 0 &&
    tomorrow.length === 0 &&
    later.length === 0 &&
    !makeUp &&
    !suggestion &&
    !(next && (next.before.length > 0 || next.after.length > 0))

  // Someone who skipped the location step lands here first, so this is the
  // screen that has to earn the permission rather than send them to settings
  // to find it. Both paths are offered, and declining is named as a real one.
  // Stays a single, centred column at every size.
  if (!hasLocation) {
    return (
      <Screen palette={palette} className="gap-6 p-4">
        <View className="items-center pt-4">
          <OnboardingArt variant="welcome" color={palette.accent} onColor={palette.onAccent} />
        </View>

        <View className="gap-2">
          <Text
            className="text-3xl leading-tight"
            style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
            {strings.today.needsLocationTitle}
          </Text>
          <Text className="text-base leading-relaxed" style={{ color: colors.secondaryLabel }}>
            {strings.today.needsLocation}
          </Text>
        </View>

        {locationProblem ? (
          <Text className="text-sm leading-relaxed" style={{ color: colors.secondaryLabel }}>
            {locationProblem === 'declined'
              ? strings.location.declined
              : strings.location.unavailable}
          </Text>
        ) : null}

        <View className="gap-3">
          <Button
            title={locating ? strings.location.locating : strings.location.useDevice}
            onPress={onUseMyLocation}
            disabled={locating}
            color={palette.accent}
            onColor={palette.onAccent}
          />
          <Row
            href={locationHref}
            title={strings.today.chooseCity}
            detail={strings.today.chooseCityDetail}
          />
        </View>
      </Screen>
    )
  }

  // Above Right now, so marking a prayer never moves the strip under the finger.
  const prayerStripSection =
    prayers.length > 0 ? (
      <Section title={strings.plan.prayers}>
        <PrayerStrip prayers={prayers} names={prayerNames(strings, jumuah)} onMark={onMarkPrayer} />
      </Section>
    ) : null

  const rightNowSection = rightNow ? (
    <Section title={strings.plan.rightNow}>
      <RightNowCard entry={rightNow} />
    </Section>
  ) : null

  const nothingElseNote = nothingElse ? (
    <Text className="text-base" style={{ color: colors.secondaryLabel }}>
      {strings.today.nothingElse}
    </Text>
  ) : null

  const upNextSection =
    next && (next.before.length > 0 || next.after.length > 0) ? (
      <Section title={strings.plan.upNext}>
        <UpNextCard next={next} names={prayerNames(strings, next.jumuah)} />
      </Section>
    ) : null

  const suggestionSection = suggestion ? (
    <Section title={strings.plan.tryOneMore}>
      <SuggestionCard
        entry={suggestion}
        palette={palette}
        onAdd={() => onAddSuggestion(suggestion.id)}
        onDismiss={() => onDismissSuggestion(suggestion.id)}
      />
    </Section>
  ) : null

  const makeUpSection = makeUp ? (
    <Section title={strings.plan.makeUp}>
      <MakeUpRows
        qada={qada}
        qadaHref={qadaHref}
        onMakeUp={onMakeUp}
        fastsOwed={fastsOwed}
        fastingToday={fastingToday}
        onRecordFastOwed={onRecordFastOwed}
        onUndoFastOwed={onUndoFastOwed}
      />
    </Section>
  ) : null

  const alsoNowList = <AgendaList title={strings.plan.alsoNow} entries={alsoNow} />
  const alsoTodayList = <AgendaList title={strings.plan.alsoToday} entries={allDay} />
  const tomorrowList = <AgendaList title={strings.plan.tomorrow} entries={tomorrow} />
  const laterList = <AgendaList title={strings.plan.comingUp} entries={later} />

  const approximateFootnote = (
    <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
      {strings.hijri.approximate}
    </Text>
  )

  // The window is the navigation title, so this line carries only the date and place.
  const metaLine = hijri ? (
    <Text className="text-base" style={{ color: colors.secondaryLabel }}>
      {[
        gregorian,
        strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year),
        placeLabel,
      ]
        .filter(Boolean)
        .join(' · ')}
    </Text>
  ) : null

  if (layout === 'compact') {
    return (
      <Screen palette={palette} className="gap-6 p-4">
        {metaLine}
        {prayerStripSection}
        {rightNowSection}
        {alsoNowList}
        {nothingElseNote}
        {upNextSection}
        {alsoTodayList}
        {suggestionSection}
        {makeUpSection}
        {tomorrowList}
        {laterList}
        {approximateFootnote}
      </Screen>
    )
  }

  return (
    <Screen palette={palette} maxWidth={1200} className="gap-6 p-4 md:p-6">
      {metaLine}
      {prayerStripSection}
      <View className="flex-row items-start gap-6">
        <View className="flex-2 gap-6">
          {rightNowSection}
          {alsoNowList}
          {nothingElseNote}
          {upNextSection}
          {alsoTodayList}
        </View>
        <View className="flex-1 gap-6">
          {suggestionSection}
          {makeUpSection}
          {tomorrowList}
          {laterList}
        </View>
      </View>
      {approximateFootnote}
    </Screen>
  )
}
