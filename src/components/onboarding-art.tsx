import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

interface StarProps {
  size: number
  color: string
  hollow?: boolean
  opacity?: number
}

/** Eight-point star: two squares, one turned 45°. The one geometric motif in the app. */
function Star({ size, color, hollow = false, opacity = 1 }: StarProps): ReactElement {
  const square = {
    position: 'absolute' as const,
    top: size * 0.14,
    start: size * 0.14,
    width: size * 0.72,
    height: size * 0.72,
    borderRadius: 2,
    ...(hollow ? { borderWidth: 2, borderColor: color } : { backgroundColor: color }),
  }

  return (
    <View style={{ width: size, height: size, opacity }}>
      <View style={square} />
      <View style={[square, { transform: [{ rotate: '45deg' }] }]} />
    </View>
  )
}

interface OnboardingArtProps {
  variant: 'welcome' | 'how'
  color: string
  onColor: string
}

const GRID = [0.3, 0.55, 0.3, 0.55, 1, 0.55, 0.3, 0.55, 0.3]

export function OnboardingArt({ variant, color, onColor }: OnboardingArtProps): ReactElement {
  if (variant === 'how') {
    return (
      <View className="items-center justify-center" style={{ width: 168, height: 168 }}>
        <View style={{ position: 'absolute' }}>
          <Star size={168} color={color} hollow />
        </View>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 44, height: 44, backgroundColor: color }}>
          <Text style={{ color: onColor, fontSize: 22 }}>✓</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-row flex-wrap justify-center" style={{ width: 174 }}>
      {GRID.map((opacity, index) => (
        <View key={index} style={{ padding: 5 }}>
          <Star size={48} color={color} hollow={index % 2 === 0 && index !== 4} opacity={opacity} />
        </View>
      ))}
    </View>
  )
}
