import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { NextPrayerEntry, TodayEntry } from '../screens/today'
import { EntryCard } from './entry-card'

export interface UpNextCardProps {
  next: NextPrayerEntry
  names: Record<Prayer, string>
  onCircle: (id: string) => void
}

/** The next prayer by name and rough distance, with the cards for what is asked around it. */
export function UpNextCard({ next, names, onCircle }: UpNextCardProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()

  const list = (title: string, entries: TodayEntry[]): ReactElement | null =>
    entries.length > 0 ? (
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {title}
        </Text>
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} onCircle={onCircle} />
        ))}
      </View>
    ) : null

  return (
    <View className="gap-4">
      <Surface style={{ borderRadius: 24, padding: 22 }}>
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
      </Surface>
      {list(strings.plan.before, next.before)}
      {list(strings.plan.after, next.after)}
    </View>
  )
}
