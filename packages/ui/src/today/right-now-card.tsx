import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { TodayEntry } from '../screens/today'

export interface RightNowCardProps {
  entry: TodayEntry
}

/** The one thing the moment calls for, so it is the one thing that dominates. */
export function RightNowCard({ entry }: RightNowCardProps): ReactElement {
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
