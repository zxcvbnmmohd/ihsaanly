import { resolveText } from '@ihsaanly/core/content'
import { terms } from '@ihsaanly/core/content/glossary'
import { useStrings } from '@ihsaanly/state/strings'
import { GlossaryScreen } from '@ihsaanly/ui/screens/glossary'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { z } from 'zod'
import { PageHeader } from '~/components/page-header'

const glossarySearch = z.object({ term: z.string().optional() })

export const Route = createFileRoute('/_library/glossary')({
  validateSearch: glossarySearch,
  component: GlossaryRoute,
})

function GlossaryRoute(): ReactElement {
  const { term } = Route.useSearch()
  const strings = useStrings()

  return (
    <>
      <PageHeader title={strings.glossary.title} />
      <GlossaryScreen
        highlighted={term ?? null}
        entries={terms.map((entry) => ({
          id: entry.id,
          term: resolveText(entry.term) ?? entry.id,
          definition: resolveText(entry.definition) ?? '',
        }))}
      />
    </>
  )
}
