import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

import { useColors } from '../colors'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps): ReactElement {
  const colors = useColors()

  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-center text-base" style={{ color: colors.secondaryLabel }}>
        {message}
      </Text>
    </View>
  )
}
