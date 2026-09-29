import type { ReactElement, ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

import { useColors } from '../colors'

interface SurfaceProps {
  children?: ReactNode
  style?: ViewProps['style']
  interactive?: boolean
}

/**
 * The web's surface: the warm translucent veil Android uses. There is no
 * liquid glass or system material here, and react-native-web has no Reduce
 * Transparency setting to follow.
 */
export function Surface({ children, style }: SurfaceProps): ReactElement {
  const colors = useColors()

  return <View style={[{ backgroundColor: colors.surface }, style]}>{children}</View>
}
