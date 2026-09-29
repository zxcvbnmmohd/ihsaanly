import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'

export interface SectionProps {
  title: string
  children: ReactNode
}

/** An accent, uppercase label above whatever it introduces. */
export function Section({ title, children }: SectionProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-3">
      <Text
        className="font-semibold text-xs uppercase tracking-wide"
        style={{ color: colors.accent }}>
        {title}
      </Text>
      {children}
    </View>
  )
}
