import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

import { useColors, usePalette } from '../colors'
import { serif } from '../fonts'

export interface NumberedStepsProps {
  steps: readonly string[]
}

/** Instructions to follow in order: each step's number in the accent, beside it. */
export function NumberedSteps({ steps }: NumberedStepsProps): ReactElement {
  const colors = useColors()
  const palette = usePalette()
  return (
    <View role="list" className="gap-2">
      {steps.map((step, index) => (
        <View key={step} role="listitem" className="flex-row gap-3">
          <Text
            className="text-base"
            style={{ fontFamily: serif, color: palette.accent, fontWeight: '600' }}>
            {index + 1}
          </Text>
          <Text className="flex-1 text-base leading-relaxed" style={{ color: colors.label }}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  )
}
