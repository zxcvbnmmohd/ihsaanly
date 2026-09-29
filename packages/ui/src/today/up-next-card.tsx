import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { NextPrayerEntry, TodayEntry } from '../screens/today'

export interface UpNextCardProps {
  next: NextPrayerEntry
  names: Record<Prayer, string>
}

/** The next prayer by name and rough distance, with what content asks around it. */
export function UpNextCard({ next, names }: UpNextCardProps): ReactElement {
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
