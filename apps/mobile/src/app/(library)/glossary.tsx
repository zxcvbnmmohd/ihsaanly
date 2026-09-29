import { resolveText } from '@ihsaanly/core/content'
import { terms } from '@ihsaanly/core/content/glossary'
import { GlossaryScreen } from '@ihsaanly/ui/screens/glossary'
import { useLocalSearchParams } from 'expo-router'
import type { ReactElement } from 'react'

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
