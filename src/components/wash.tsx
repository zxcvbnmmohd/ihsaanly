import type { ReactElement } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet } from 'react-native'

import type { Palette } from '@/theme/colors'

interface WashProps {
  palette: Palette
}

/** The brand backdrop. One implementation, shared by onboarding and the tabs. */
export function Wash({ palette }: WashProps): ReactElement {
  return (
    <LinearGradient
      colors={palette.wash}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  )
}
