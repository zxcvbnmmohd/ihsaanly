import type { ReactElement } from 'react'
import type { ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { ScrollView } from 'react-native'

import type { Palette } from '@/theme/colors'

/**
 * One scroll container for every screen. `contentInsetAdjustmentBehavior` is
 * iOS-only, so anything Android needs to do differently belongs here rather
 * than in each screen.
 *
 * The brand wash is the gradient *around* the scroll view, not a sibling
 * behind it. UIKit finds the scroll view a large title collapses against by
 * walking first subviews from the screen's root, so an absolutely positioned
 * backdrop rendered first hid it and left the title pinned while the content
 * slid underneath. With the gradient as the container the scroll view is the
 * first and only child, and the title collapses as it does everywhere else.
 */
interface ScreenProps {
  children: ReactNode
  className?: string
  palette?: Palette
}

export function Screen({ children, className, palette }: ScreenProps): ReactElement {
  const scroll = (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      // Without this the first tap on a search result only dismisses the
      // keyboard and the row has to be tapped twice.
      keyboardShouldPersistTaps="handled"
      contentContainerClassName={className ?? 'gap-4 p-4'}
      // A reading column on iPad and tablets; a phone is narrower than the cap.
      contentContainerStyle={{ width: '100%', maxWidth: 720, alignSelf: 'center' }}>
      {children}
    </ScrollView>
  )
  if (!palette) return scroll

  return (
    <LinearGradient
      colors={palette.wash}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={{ flex: 1 }}>
      {scroll}
    </LinearGradient>
  )
}
