import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

export interface DiagnosticsScreenProps {
  facts: [string, string][]
  recent: string[]
  onRecordTestMark: () => void
}

export function DiagnosticsScreen({
  facts,
  recent,
  onRecordTestMark,
}: DiagnosticsScreenProps): ReactElement {
  useColorScheme()

  return (
    <Screen className="gap-6 p-4">
      <View className="gap-2">
        {facts.map(([label, value]) => (
          <View key={label} className="gap-0.5">
            <Text className="text-xs uppercase" style={{ color: colors.secondaryLabel }}>
              {label}
            </Text>
            <Text selectable className="text-sm" style={{ color: colors.label }}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Row title={strings.diagnostics.record} onPress={onRecordTestMark} />

      <View className="gap-1">
        <Text className="text-xs uppercase" style={{ color: colors.secondaryLabel }}>
          events
        </Text>
        {recent.length === 0 ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.diagnostics.nothing}
          </Text>
        ) : (
          recent.map((line) => (
            <Text key={line} selectable className="text-xs" style={{ color: colors.label }}>
              {line}
            </Text>
          ))
        )}
      </View>
    </Screen>
  )
}
