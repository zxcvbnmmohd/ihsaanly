import { assertNever } from '@ihsaanly/core/assert-never'
import type { HijriDate } from '@ihsaanly/core/hijri/calendar'
import { prayerNames } from '@ihsaanly/core/plan/jumuah'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { CoachMark } from '../components/coach-mark'
import { OnboardingArt } from '../components/onboarding-art'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { useUi } from '../provider'
import { AgendaList } from '../today/agenda-list'
import { CounterPanel } from '../today/counter-panel'
import { DoneSection } from '../today/done-section'
import { MakeUpRows } from '../today/make-up-rows'
import { PartsPanel } from '../today/parts-panel'
import { CheckInCard, PausedNotice } from '../today/paused-notice'
import { PrayerStrip } from '../today/prayer-strip'
import { RightNowCard } from '../today/right-now-card'
import { Section } from '../today/section'
import { SuggestionCard } from '../today/suggestion-card'
import { TourAnchorContext } from '../today/tour-anchor'
import { UndoBar } from '../today/undo-bar'
import { UpNextCard } from '../today/up-next-card'
import {
  type EntryMark,
  TOUR_STEPS,
  type TodayCheckIn,
  type TodayPanel,
  type TodayTour,
  type TodayUndo,
} from '../types'
import type { LocationProblem } from './onboarding'

export interface TodayEntry {
  id: string
  title: string
  detail: string | null
  href: string
  /** The circle at the row's start; null for a row with nothing to mark (tomorrow, later). */
  mark: EntryMark | null
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
  /** Sunnah already marked today, in the folded "Done today" section. */
  doneToday: TodayEntry[]
  /**
   * A row's circle was pressed. The route decides what that means from the
   * row's mark: mark or unmark it, count once, or open its panel.
   */
  onCircle: (id: string) => void
  /** "Marked done · Undo" after a mark; null when there is nothing to undo. */
  undo: TodayUndo | null
  /** The undo bar timed out (`UNDO_MS`). */
  onDismissUndo: () => void
  /** The counter or parts sheet that is open, if any. */
  panel: TodayPanel | null
  onClosePanel: () => void
  onCount: (itemId: string) => void
  /** A counter reached its target. */
  onComplete: (itemId: string) => void
  onMarkAll: (itemId: string) => void
  onTogglePart: (itemId: string, partId: string) => void
  /** "Tap a prayer when you've prayed it" under the strip, until the route decides it is learned. */
  prayerHint: boolean
  /** The first-run tour, or null when it is not showing. */
  tour: TodayTour | null
  /** Prayer tracking is paused: a quiet notice stands where the strip was. */
  paused: boolean
  /** While paused, once the check-in the user asked for is due. */
  checkIn: TodayCheckIn | null
}

/** The first row with a circle, which the tour's second and third steps point at. */
function firstMarkable(groups: TodayEntry[][]): TodayEntry | null {
  for (const group of groups) {
    const found = group.find((entry) => entry.mark !== null)
    if (found) return found
  }
  return null
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
  doneToday,
  onCircle,
  undo,
  onDismissUndo,
  panel,
  onClosePanel,
  onCount,
  onComplete,
  onMarkAll,
  onTogglePart,
  prayerHint,
  tour,
  paused,
  checkIn,
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

  // The tour points at the next prayer to mark, then at the first sunnah
  // row. With nothing on screen to point at, the tip still shows, at the top.
  const prayerTarget = prayers.findIndex((entry) => !entry.done)
  const sunnahTarget = firstMarkable([now, next?.before ?? [], next?.after ?? [], allDay])
  const tourTarget: 'strip' | 'row' | 'top' | null = !tour
    ? null
    : tour.step === 0
      ? prayers.length > 0
        ? 'strip'
        : 'top'
      : sunnahTarget
        ? 'row'
        : 'top'

  const coachMark = (arrowAt: number | `${number}%` | null): ReactNode =>
    tour ? (
      <CoachMark
        text={[strings.tour.prayer, strings.tour.sunnah, strings.tour.card][tour.step] ?? ''}
        step={tour.step}
        total={TOUR_STEPS}
        onNext={tour.onNext}
        onSkip={tour.onSkip}
        arrowAt={arrowAt}
      />
    ) : null

  // Above Right now, so marking a prayer never moves the strip under the finger.
  const prayerStripSection = paused ? (
    <View className="gap-3">
      <PausedNotice />
      {checkIn ? <CheckInCard checkIn={checkIn} /> : null}
    </View>
  ) : prayers.length > 0 ? (
    <Section title={strings.plan.prayers}>
      <PrayerStrip prayers={prayers} names={prayerNames(strings, jumuah)} onMark={onMarkPrayer} />
      {prayerHint ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.today.prayerHint}
        </Text>
      ) : null}
      {tourTarget === 'strip'
        ? coachMark(`${((Math.max(prayerTarget, 0) + 0.5) / prayers.length) * 100}%`)
        : null}
    </Section>
  ) : null

  const topCoachMark = tourTarget === 'top' ? coachMark(null) : null

  // The second step points at the circle (its centre is 30pt in from the
  // card's start edge), the third at the card itself.
  const tourAnchor = {
    id: tourTarget === 'row' ? (sunnahTarget?.id ?? null) : null,
    node: coachMark(tour?.step === 1 ? 30 : '50%'),
  }

  const rightNowSection = rightNow ? (
    <Section title={strings.plan.rightNow}>
      <RightNowCard entry={rightNow} onCircle={onCircle} />
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
        <UpNextCard next={next} names={prayerNames(strings, next.jumuah)} onCircle={onCircle} />
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

  const alsoNowList = (
    <AgendaList title={strings.plan.alsoNow} entries={alsoNow} onCircle={onCircle} />
  )
  const alsoTodayList = (
    <AgendaList title={strings.plan.alsoToday} entries={allDay} onCircle={onCircle} />
  )
  const tomorrowList = (
    <AgendaList title={strings.plan.tomorrow} entries={tomorrow} onCircle={onCircle} />
  )
  const laterList = <AgendaList title={strings.plan.comingUp} entries={later} onCircle={onCircle} />
  const doneSection = <DoneSection entries={doneToday} onCircle={onCircle} />

  const panelSheet = ((): ReactNode => {
    if (!panel) return null
    switch (panel.kind) {
      case 'count':
        return (
          <CounterPanel
            panel={panel}
            onCount={onCount}
            onComplete={onComplete}
            onMarkAll={onMarkAll}
            onClose={onClosePanel}
          />
        )
      case 'parts':
        return (
          <PartsPanel
            panel={panel}
            onTogglePart={onTogglePart}
            onMarkAll={onMarkAll}
            onClose={onClosePanel}
          />
        )
      default:
        return assertNever(panel)
    }
  })()

  // The undo bar floats over the screen's foot, and the sheets are modal; the
  // scroll view stays the first thing inside the screen so iOS's large title
  // still collapses against it.
  const overlay = (screen: ReactElement): ReactElement => (
    <TourAnchorContext.Provider value={tourAnchor}>
      <View className="flex-1">
        {screen}
        <UndoBar undo={undo} onDismiss={onDismissUndo} />
        {panelSheet}
      </View>
    </TourAnchorContext.Provider>
  )

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

  // Room under the last card so the undo bar never covers it.
  const undoRoom = <View style={{ height: undo ? 72 : 0 }} />

  if (layout === 'compact') {
    return overlay(
      <Screen palette={palette} className="gap-6 p-4">
        {metaLine}
        {topCoachMark}
        {prayerStripSection}
        {rightNowSection}
        {alsoNowList}
        {nothingElseNote}
        {upNextSection}
        {alsoTodayList}
        {doneSection}
        {suggestionSection}
        {makeUpSection}
        {tomorrowList}
        {laterList}
        {approximateFootnote}
        {undoRoom}
      </Screen>,
    )
  }

  return overlay(
    <Screen palette={palette} maxWidth={1200} className="gap-6 p-4 md:p-6">
      {metaLine}
      {topCoachMark}
      {prayerStripSection}
      <View className="flex-row items-start gap-6">
        <View className="flex-2 gap-6">
          {rightNowSection}
          {alsoNowList}
          {nothingElseNote}
          {upNextSection}
          {alsoTodayList}
          {doneSection}
        </View>
        <View className="flex-1 gap-6">
          {suggestionSection}
          {makeUpSection}
          {tomorrowList}
          {laterList}
        </View>
      </View>
      {approximateFootnote}
      {undoRoom}
    </Screen>,
  )
}
