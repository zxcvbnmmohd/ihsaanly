import type { ActionSummary } from '@ihsaanly/core/plan/history'
import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { EmptyState } from '../components/empty-state'
import { Screen } from '../components/screen'
import { useUi } from '../provider'

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
  const colors = useColors()
  const { strings } = useUi()

  if (summaries.length === 0) return null

  return (
    <View className="gap-2">
      <Text
        accessibilityRole="header"
        aria-level={2}
        className="font-semibold text-xs uppercase"
        style={{ color: colors.secondaryLabel }}>
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
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  if (daysActive === 0) {
    return <EmptyState message={strings.history.empty} />
  }

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.history.daysActive(daysActive)}
      </Text>
      {/* Summaries need a few days to mean anything; say what is coming instead of a blank wash. */}
      {daysActive < 7 ? (
        <Text className="text-base leading-6" style={{ color: colors.label }}>
          {strings.history.firstWeek}
        </Text>
      ) : null}
      <Group title={strings.history.prayers} summaries={prayers} labelFor={labelFor} />
      <Group title={strings.history.completed} summaries={items} labelFor={labelFor} />
    </Screen>
  )
}
