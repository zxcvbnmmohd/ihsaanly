import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { Screen } from '@/components/screen'
import type { ActionSummary } from '@/plan/history'
import { useStrings, type Strings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface HistoryScreenProps {
  daysActive: number
  prayers: ActionSummary[]
  items: ActionSummary[]
  labelFor: (subject: string) => string
}

function offsetLabel(seconds: number | null, strings: Strings): string | null {
  if (seconds === null) return null
  const minutes = Math.round(Math.abs(seconds) / 60)
  if (minutes === 0) return null
  return seconds < 0 ? strings.history.early(minutes) : strings.history.late(minutes)
}

function Group({
  title,
  summaries,
  labelFor,
}: {
  title: string
  summaries: ActionSummary[]
  labelFor: (subject: string) => string
}): ReactElement | null {
  const strings = useStrings()
  useColorScheme()

  if (summaries.length === 0) return null

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
        {title}
      </Text>
      {summaries.map((summary) => (
        <View key={summary.subject} className="gap-0.5">
          <Text className="text-base" style={{ color: colors.label }}>
            {labelFor(summary.subject)} · {strings.history.times(summary.count)}
          </Text>
          {offsetLabel(summary.typicalOffsetSeconds, strings) ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {offsetLabel(summary.typicalOffsetSeconds, strings)}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

export function HistoryScreen({
  daysActive,
  prayers,
  items,
  labelFor,
}: HistoryScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  if (daysActive === 0) {
    return <EmptyState message={strings.history.empty} />
  }

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.history.daysActive(daysActive)}
      </Text>
      <Group title={strings.history.prayers} summaries={prayers} labelFor={labelFor} />
      <Group title={strings.history.completed} summaries={items} labelFor={labelFor} />
    </Screen>
  )
}
