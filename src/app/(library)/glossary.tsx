import { useLocalSearchParams } from 'expo-router'
import type { ReactElement } from 'react'

import { resolveText } from '@/content'
import { terms } from '@/content/glossary'
import { GlossaryScreen } from '@/screens/glossary'

export default function GlossaryRoute(): ReactElement {
  const { term } = useLocalSearchParams<{ term?: string }>()

  return (
    <GlossaryScreen
      highlighted={term ?? null}
      entries={terms.map((entry) => ({
        id: entry.id,
        term: resolveText(entry.term) ?? entry.id,
        definition: resolveText(entry.definition) ?? '',
      }))}
    />
  )
}
