import type { ReactElement } from 'react'
import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'

/**
 * One scroll container for every screen. `contentInsetAdjustmentBehavior` is
 * iOS-only, so anything Android needs to do differently belongs here rather
 * than in each screen.
 */
interface ScreenProps {
  children: ReactNode
  className?: string
}

export function Screen({ children, className }: ScreenProps): ReactElement {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName={className ?? 'gap-4 p-4'}>
      {children}
    </ScrollView>
  )
}
