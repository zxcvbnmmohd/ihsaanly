import type { ReactElement } from 'react'
import type { TodayEntry } from '../screens/today'
import { EntryCard } from './entry-card'

export interface RightNowCardProps {
  entry: TodayEntry
  onCircle: (id: string) => void
}

/** The one thing the moment calls for, so it is the one thing that dominates. */
export function RightNowCard({ entry, onCircle }: RightNowCardProps): ReactElement {
  return <EntryCard entry={entry} onCircle={onCircle} variant="hero" testID="right-now" />
}
