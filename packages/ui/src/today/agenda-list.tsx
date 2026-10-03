import type { ReactElement } from 'react'
import type { TodayEntry } from '../screens/today'
import { EntryCard } from './entry-card'
import { Section } from './section'

export interface AgendaListProps {
  title: string
  entries: TodayEntry[]
  onCircle: (id: string) => void
}

/** A titled list of cards: Also now, Also today, Tomorrow and Later this week all share this shape. */
export function AgendaList({ title, entries, onCircle }: AgendaListProps): ReactElement | null {
  if (entries.length === 0) return null

  return (
    <Section title={title}>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onCircle={onCircle} />
      ))}
    </Section>
  )
}
