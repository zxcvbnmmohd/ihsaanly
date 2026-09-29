import type { HijriDate } from '@ihsaanly/core/hijri/calendar'
import { prayerNames } from '@ihsaanly/core/plan/jumuah'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { type Palette, palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement, ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { OnboardingArt } from '../components/onboarding-art'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
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

interface SectionProps {
  title: string
  children: ReactNode
}

function Section({ title, children }: SectionProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-3">
      <Text
        className="font-semibold text-xs uppercase tracking-wide"
        style={{ color: colors.accent }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

interface RightNowCardProps {
  entry: TodayEntry
}

/** The one thing the moment calls for, so it is the one thing that dominates. */
function RightNowCard({ entry }: RightNowCardProps): ReactElement {
  const colors = useColors()
  const { Link } = useUi()

  return (
    <Link href={entry.href} asChild>
      <Pressable accessibilityRole="link" testID="right-now">
        <Surface interactive style={{ borderRadius: 24, padding: 22, overflow: 'hidden' }}>
          <View className="flex-row gap-4">
            <View style={{ backgroundColor: colors.accent, width: 4, borderRadius: 2 }} />
            <View className="flex-1 gap-1.5">
              <Text
                className="text-2xl leading-tight"
                style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
                {entry.title}
              </Text>
              {entry.detail ? (
                <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
                  {entry.detail}
                </Text>
              ) : null}
            </View>
          </View>
        </Surface>
      </Pressable>
    </Link>
  )
}

interface UpNextCardProps {
  next: NextPrayerEntry
  names: Record<Prayer, string>
}

/** The next prayer by name and rough distance, with what content asks around it. */
function UpNextCard({ next, names }: UpNextCardProps): ReactElement {
  const colors = useColors()
  const { strings, Link } = useUi()

  const list = (title: string, entries: TodayEntry[]): ReactElement | null =>
    entries.length > 0 ? (
      <View className="gap-1.5">
        <Text className="font-semibold text-xs uppercase" style={{ color: colors.secondaryLabel }}>
          {title}
        </Text>
        {entries.map((entry) => (
          <Link key={entry.id} href={entry.href} asChild>
            <Pressable accessibilityRole="link" className="py-1">
              <Text className="text-base" style={{ color: colors.label }}>
                {entry.title}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    ) : null

  return (
    <Surface style={{ borderRadius: 24, padding: 22 }}>
      <View className="gap-4">
        <View className="gap-0.5">
          <Text
            className="text-2xl leading-tight"
            style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
            {names[next.prayer]}
          </Text>
          <Text className="text-sm" style={{ color: colors.accent }}>
            {next.distance}
          </Text>
        </View>
        {list(strings.plan.before, next.before)}
        {list(strings.plan.after, next.after)}
      </View>
    </Surface>
  )
}

interface SuggestionCardProps {
  entry: SuggestionEntry
  palette: Palette
  onAdd: () => void
  onDismiss: () => void
}

/** Growth, one item at a time: what it is, why it matters, and a way to say yes or not yet. */
function SuggestionCard({ entry, palette, onAdd, onDismiss }: SuggestionCardProps): ReactElement {
  const colors = useColors()
  const { strings, Link } = useUi()

  return (
    <Surface style={{ borderRadius: 24, padding: 22 }}>
      <View className="gap-4">
        <Link href={entry.href} asChild>
          <Pressable accessibilityRole="link">
            <View className="gap-1.5">
              <Text
                className="text-2xl leading-tight"
                style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
                {entry.title}
              </Text>
              {entry.why ? (
                <Text
                  className="text-sm leading-snug"
                  style={{ color: colors.secondaryLabel }}
                  numberOfLines={3}>
                  {entry.why}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Button
              title={strings.plan.add}
              onPress={onAdd}
              color={palette.accent}
              onColor={palette.onAccent}
            />
          </View>
          <Button
            title={strings.plan.notNow}
            onPress={onDismiss}
            variant="secondary"
            color={palette.accent}
          />
        </View>
      </View>
    </Surface>
  )
}

interface PrayerStripProps {
  prayers: PrayerEntry[]
  names: Record<Prayer, string>
  onMark: (prayer: Prayer) => void
}

/** Five marks in a row: the whole day's prayers readable at a glance. */
function PrayerStrip({ prayers, names, onMark }: PrayerStripProps): ReactElement {
  const colors = useColors()
  const palette = palettes[useUi().scheme]
  return (
    <View className="flex-row gap-2">
      {prayers.map((entry) => (
        <Pressable
          key={entry.prayer}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entry.done }}
          // react-native-web reads only the aria-* form.
          aria-checked={entry.done}
          accessibilityLabel={names[entry.prayer]}
          onPress={() => onMark(entry.prayer)}
          testID={`prayer-${entry.prayer}`}
          className="flex-1">
          <Surface interactive style={{ borderRadius: 16, paddingVertical: 14 }}>
            <View className="items-center gap-2">
              <View
                className="items-center justify-center rounded-full"
                style={{
                  ...(entry.done
                    ? { borderColor: palette.accent, backgroundColor: palette.accent }
                    : { borderColor: colors.separator }),
                  width: 26,
                  height: 26,
                  borderWidth: 2,
                  // Passed and unmarked is quieter than still to come, so the
                  // strip reads as a day rather than five identical buttons.
                  borderStyle: entry.passed && !entry.done ? 'dashed' : 'solid',
                  opacity: entry.passed && !entry.done ? 0.6 : 1,
                }}>
                {entry.done ? (
                  <Text style={{ color: palette.onAccent, fontSize: 13, lineHeight: 16 }}>✓</Text>
                ) : null}
              </View>
              <Text
                className="font-semibold text-xs"
                style={{ color: entry.done ? colors.label : colors.secondaryLabel }}
                numberOfLines={1}>
                {names[entry.prayer]}
              </Text>
            </View>
          </Surface>
        </Pressable>
      ))}
    </View>
  )
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

  const [rightNow = null, ...alsoNow] = now
  const firstQada = qada[0]
  // The commonest state is one of each owed; five rows say what one does.
  const qadaUniform = qada.length > 1 && qada.every((entry) => entry.count === firstQada?.count)
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

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {/* The window is the navigation title, so this line carries only the date and place. */}
      {hijri ? (
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {[
            gregorian,
            strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year),
            placeLabel,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}

      {/* Above Right now, so marking a prayer never moves the strip under the finger. */}
      {prayers.length > 0 ? (
        <Section title={strings.plan.prayers}>
          <PrayerStrip
            prayers={prayers}
            names={prayerNames(strings, jumuah)}
            onMark={onMarkPrayer}
          />
        </Section>
      ) : null}

      {rightNow ? (
        <Section title={strings.plan.rightNow}>
          <RightNowCard entry={rightNow} />
        </Section>
      ) : null}

      {alsoNow.length > 0 ? (
        <Section title={strings.plan.alsoNow}>
          {alsoNow.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      {nothingElse ? (
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {strings.today.nothingElse}
        </Text>
      ) : null}

      {next && (next.before.length > 0 || next.after.length > 0) ? (
        <Section title={strings.plan.upNext}>
          <UpNextCard next={next} names={prayerNames(strings, next.jumuah)} />
        </Section>
      ) : null}

      {allDay.length > 0 ? (
        <Section title={strings.plan.alsoToday}>
          {allDay.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      {suggestion ? (
        <Section title={strings.plan.tryOneMore}>
          <SuggestionCard
            entry={suggestion}
            palette={palette}
            onAdd={() => onAddSuggestion(suggestion.id)}
            onDismiss={() => onDismissSuggestion(suggestion.id)}
          />
        </Section>
      ) : null}

      {makeUp ? (
        <Section title={strings.plan.makeUp}>
          {qada.length === 0 ? null : qadaUniform ? (
            <Row
              href={qadaHref}
              title={strings.qada.summary(qada.reduce((sum, entry) => sum + entry.count, 0))}
              detail={qada.map((entry) => strings.prayer[entry.prayer]).join(', ')}
            />
          ) : (
            <>
              {qada.map((entry) => (
                <Row
                  key={entry.prayer}
                  title={strings.prayer[entry.prayer]}
                  detail={strings.plan.outstanding(entry.count)}
                  onPress={() => onMakeUp(entry.prayer)}
                />
              ))}
              <Row href={qadaHref} title={strings.qada.manage} detail={strings.qada.manageDetail} />
            </>
          )}
          {fastsOwed > 0 ? (
            <Row href={qadaHref} title={strings.fasting.summary(fastsOwed)} />
          ) : null}
          {/* A quiet row, and only in Ramadan: saying so is the user's act, never an inference. */}
          {fastingToday ? (
            fastingToday.recorded ? (
              <Row
                title={strings.fasting.recordedToday}
                detail={strings.fasting.undo}
                onPress={onUndoFastOwed}
                selected
              />
            ) : (
              <Row
                title={strings.fasting.notFastingToday}
                detail={strings.fasting.notFastingTodayDetail}
                onPress={onRecordFastOwed}
              />
            )
          ) : null}
        </Section>
      ) : null}

      {tomorrow.length > 0 ? (
        <Section title={strings.plan.tomorrow}>
          {tomorrow.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      {later.length > 0 ? (
        <Section title={strings.plan.comingUp}>
          {later.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
        {strings.hijri.approximate}
      </Text>
    </Screen>
  )
}
