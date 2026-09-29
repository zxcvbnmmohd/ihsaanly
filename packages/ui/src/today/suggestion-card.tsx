import type { Palette } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { SuggestionEntry } from '../screens/today'

export interface SuggestionCardProps {
  entry: SuggestionEntry
  palette: Palette
  onAdd: () => void
  onDismiss: () => void
}

/** Growth, one item at a time: what it is, why it matters, and a way to say yes or not yet. */
export function SuggestionCard({
  entry,
  palette,
  onAdd,
  onDismiss,
}: SuggestionCardProps): ReactElement {
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
