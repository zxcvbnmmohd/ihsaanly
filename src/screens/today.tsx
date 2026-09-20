import { Link, type Href } from 'expo-router'
import type { ReactElement, ReactNode } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import { Wash } from '@/components/wash'
import type { HijriDate } from '@/hijri/calendar'
import type { Prayer } from '@/prayer/qada'
import type { WindowName } from '@/prayer/windows'
import { useStrings } from '@/strings'
import { colors, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/store'

export interface TodayEntry {
  id: string
  title: string
  detail: string | null
  href: Href
}

export interface PrayerEntry {
  prayer: Prayer
  done: boolean
}

export interface QadaEntry {
  prayer: Prayer
  count: number
}

export interface NextPrayerEntry {
  prayer: Prayer
  distance: string
  before: TodayEntry[]
  after: TodayEntry[]
}

export interface TodayScreenProps {
  hasLocation: boolean
  window: WindowName | null
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
  locationHref: Href
}

interface SectionProps {
  title: string
  accent: string
  children: ReactNode
}

function Section({ title, accent, children }: SectionProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold tracking-wide uppercase" style={{ color: accent }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

interface RightNowCardProps {
  entry: TodayEntry
  palette: Palette
}

/** The one thing the moment calls for, so it is the one thing that dominates. */
function RightNowCard({ entry, palette }: RightNowCardProps): ReactElement {
  useColorScheme()

  return (
    <Link href={entry.href} asChild>
      <Pressable accessibilityRole="link">
        <Surface interactive style={{ borderRadius: 24, padding: 22, overflow: 'hidden' }}>
          <View className="flex-row gap-4">
            <View style={{ width: 4, borderRadius: 2, backgroundColor: palette.accent }} />
            <View className="flex-1 gap-1.5">
              <Text
                className="text-2xl leading-tight"
                style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
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
  palette: Palette
}

/** The next prayer by name and rough distance, with what content asks around it. */
function UpNextCard({ next, names, palette }: UpNextCardProps): ReactElement {
  const strings = useStrings()
  useColorScheme()

  const list = (title: string, entries: TodayEntry[]): ReactElement | null =>
    entries.length > 0 ? (
      <View className="gap-1.5">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
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
            style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
            {names[next.prayer]}
          </Text>
          <Text className="text-sm" style={{ color: palette.accent }}>
            {next.distance}
          </Text>
        </View>
        {list(strings.plan.before, next.before)}
        {list(strings.plan.after, next.after)}
      </View>
    </Surface>
  )
}

interface PrayerStripProps {
  prayers: PrayerEntry[]
  names: Record<Prayer, string>
  palette: Palette
  onMark: (prayer: Prayer) => void
}

/** Five marks in a row: the whole day's prayers readable at a glance. */
function PrayerStrip({ prayers, names, palette, onMark }: PrayerStripProps): ReactElement {
  useColorScheme()

  return (
    <View className="flex-row gap-2">
      {prayers.map((entry) => (
        <Pressable
          key={entry.prayer}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entry.done }}
          accessibilityLabel={names[entry.prayer]}
          onPress={() => onMark(entry.prayer)}
          className="flex-1">
          <Surface interactive style={{ borderRadius: 16, paddingVertical: 14 }}>
            <View className="items-center gap-2">
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: 26,
                  height: 26,
                  borderWidth: 2,
                  borderColor: entry.done ? palette.accent : colors.separator,
                  backgroundColor: entry.done ? palette.accent : undefined,
                }}>
                {entry.done ? (
                  <Text style={{ color: palette.onAccent, fontSize: 13, lineHeight: 16 }}>✓</Text>
                ) : null}
              </View>
              <Text
                className="text-xs font-semibold"
                numberOfLines={1}
                style={{ color: entry.done ? colors.label : colors.secondaryLabel }}>
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
  window,
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
  locationHref,
}: TodayScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  const [rightNow = null, ...alsoNow] = now

  if (!hasLocation) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
        <Wash palette={palette} />
        <Screen className="gap-4 p-4">
          <Text
            className="pt-2 text-3xl leading-tight"
            style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
            {strings.today.title}
          </Text>
          <Text className="text-base leading-relaxed" style={{ color: colors.secondaryLabel }}>
            {strings.today.needsLocation}
          </Text>
          <Row
            href={locationHref}
            title={strings.location.title}
            detail={strings.location.notSet}
          />
        </Screen>
      </View>
    )
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <Wash palette={palette} />
      <Screen className="gap-6 p-4">
        <View className="gap-1 pt-2">
          <Text
            className="text-4xl leading-tight"
            style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
            {window ? strings.window[window] : strings.today.title}
          </Text>
          {hijri ? (
            <Text className="text-base" style={{ color: colors.secondaryLabel }}>
              {strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year)}
              {placeLabel ? ` · ${placeLabel}` : ''}
            </Text>
          ) : null}
        </View>

        {rightNow ? (
          <Section title={strings.plan.rightNow} accent={palette.accent}>
            <RightNowCard entry={rightNow} palette={palette} />
          </Section>
        ) : null}

        {alsoNow.length > 0 ? (
          <Section title={strings.plan.alsoNow} accent={palette.accent}>
            {alsoNow.map((entry) => (
              <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
            ))}
          </Section>
        ) : null}

        {prayers.length > 0 ? (
          <Section title={strings.plan.prayers} accent={palette.accent}>
            <PrayerStrip
              prayers={prayers}
              names={strings.prayer}
              palette={palette}
              onMark={onMarkPrayer}
            />
          </Section>
        ) : null}

        {next && (next.before.length > 0 || next.after.length > 0) ? (
          <Section title={strings.plan.upNext} accent={palette.accent}>
            <UpNextCard next={next} names={strings.prayer} palette={palette} />
          </Section>
        ) : null}

        {allDay.length > 0 ? (
          <Section title={strings.plan.alsoToday} accent={palette.accent}>
            {allDay.map((entry) => (
              <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
            ))}
          </Section>
        ) : null}

        {qada.length > 0 ? (
          <Section title={strings.plan.makeUp} accent={palette.accent}>
            {qada.map((entry) => (
              <Row
                key={entry.prayer}
                title={strings.prayer[entry.prayer]}
                detail={strings.plan.outstanding(entry.count)}
                onPress={() => onMakeUp(entry.prayer)}
              />
            ))}
          </Section>
        ) : null}

        {tomorrow.length > 0 ? (
          <Section title={strings.plan.tomorrow} accent={palette.accent}>
            {tomorrow.map((entry) => (
              <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
            ))}
          </Section>
        ) : null}

        {later.length > 0 ? (
          <Section title={strings.plan.comingUp} accent={palette.accent}>
            {later.map((entry) => (
              <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
            ))}
          </Section>
        ) : null}

        <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
          {strings.hijri.approximate}
        </Text>
      </Screen>
    </View>
  )
}
