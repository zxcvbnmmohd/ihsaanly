import type { ReactElement } from 'react'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { useUi } from '../provider'
import type { TodayEntry } from '../screens/today'
import { EntryCard } from './entry-card'

export interface DoneSectionProps {
  entries: TodayEntry[]
  /** A done row's filled circle unmarks it. */
  onCircle: (id: string) => void
}

interface Thing {
  open: boolean
}

/**
 * What is already done today, folded away by default so the screen keeps
 * pointing at what is left. Marking a row moves it here at once; its filled
 * circle unmarks it.
 */
export function DoneSection({ entries, onCircle }: DoneSectionProps): ReactElement | null {
  const [thing, setThing] = useState<Thing>({ open: false })
  const colors = useColors()
  const { strings } = useUi()

  if (entries.length === 0) return null

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: thing.open }}
        // react-native-web reads only the aria-* form.
        aria-expanded={thing.open}
        onPress={() => setThing((current) => ({ ...current, open: !current.open }))}
        className="flex-row items-center gap-2 py-2"
        style={{ minHeight: 44 }}>
        <Text
          className="font-semibold text-xs uppercase tracking-wide"
          style={{ color: colors.accent }}>
          {strings.today.doneToday(entries.length)}
        </Text>
        <Text
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ color: colors.accent, fontSize: 12 }}>
          {thing.open ? '▾' : '▸'}
        </Text>
      </Pressable>
      {thing.open
        ? entries.map((entry) => <EntryCard key={entry.id} entry={entry} onCircle={onCircle} />)
        : null}
    </View>
  )
}
