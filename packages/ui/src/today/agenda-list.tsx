import type { ReactElement } from 'react'
import { Row } from '../components/row'
import type { TodayEntry } from '../screens/today'
import { Section } from './section'

export interface AgendaListProps {
  title: string
  entries: TodayEntry[]
}

/** A titled list of rows: Also now, Also today, Tomorrow and Later this week all share this shape. */
export function AgendaList({ title, entries }: AgendaListProps): ReactElement | null {
  if (entries.length === 0) return null

  return (
    <Section title={title}>
      {entries.map((entry) => (
        <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
      ))}
    </Section>
  )
}
