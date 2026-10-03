import { itemById, items, resolveText } from '@ihsaanly/core/content'
import { groupByCategory, searchItems } from '@ihsaanly/core/content/search'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import { useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { useStrings } from '@ihsaanly/state/strings'
import { Panel } from '@ihsaanly/ui/components/panel'
import { useLayout } from '@ihsaanly/ui/layout'
import { passes } from '@ihsaanly/ui/props/library'
import {
  type LibraryFilter,
  LibraryScreen,
  type LibrarySectionView,
} from '@ihsaanly/ui/screens/library'
import {
  createFileRoute,
  Outlet,
  useMatches,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_library')({ component: LibraryRoute })

interface Thing {
  query: string
  filter: LibraryFilter
}

// The three children this layout can show in its panel (regular/wide) or as
// a full page (compact) — see routes/_library/{item/$id,item/memorise/$id,glossary}.tsx.
const ITEM_ROUTE_ID = '/_library/item/$id'
const MEMORISE_ROUTE_ID = '/_library/item/memorise/$id'
const GLOSSARY_ROUTE_ID = '/_library/glossary'

function LibraryRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '', filter: 'all' })
  const strings = useStrings()
  const layout = useLayout()
  const navigate = useNavigate()
  const enabled = useEnabledItems()
  const known = useKnownItems()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const matches = useMatches()

  const itemMatch = matches.find((match) => match.routeId === ITEM_ROUTE_ID)
  const memoriseMatch = matches.find((match) => match.routeId === MEMORISE_ROUTE_ID)
  const glossaryMatch = matches.find((match) => match.routeId === GLOSSARY_ROUTE_ID)
  const hasChild = pathname !== '/library'
  const selectedId =
    ((itemMatch ?? memoriseMatch)?.params as { id?: string } | undefined)?.id ?? null

  const itemTitle = (id: string): string => {
    const item = itemById(id)
    return item ? (resolveText(item.title) ?? item.id) : strings.notFound.title
  }

  const panelTitle = (): string => {
    if (glossaryMatch) return strings.glossary.title
    if (memoriseMatch) return strings.memorise.title
    return selectedId ? itemTitle(selectedId) : ''
  }

  // Escape closes the panel back to the plain grid — only meaningful at
  // regular/wide, where a panel can be open beside it.
  useEffect(() => {
    if (layout === 'compact' || !hasChild) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') void navigate({ to: '/library' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [layout, hasChild, navigate])

  const matching = searchItems(items, thing.query)
  const labelOf = (category: string): string => strings.category[category] ?? category
  const setQuery = (query: string): void => setThing((current) => ({ ...current, query }))

  const sections: LibrarySectionView[] = groupByCategory(
    matching.filter((item) => passes(item, thing.filter, enabled, known)),
  )
    .map((section) => ({
      category: section.category,
      entries: section.items.map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        ruling: item.ruling,
        href: `/item/${item.id}` as const,
        onToday: enabled.includes(item.id),
        known: known.includes(item.id),
      })),
    }))
    .sort((left, right) => labelOf(left.category).localeCompare(labelOf(right.category)))

  const screen = (
    <LibraryScreen
      query={thing.query}
      filter={thing.filter}
      counts={{
        all: matching.length,
        onToday: matching.filter((item) => enabled.includes(item.id)).length,
        known: matching.filter((item) => known.includes(item.id)).length,
      }}
      sections={sections}
      glossaryHref="/glossary"
      onFilterChange={(filter) => setThing((current) => ({ ...current, filter }))}
      searchable={{
        query: thing.query,
        onQueryChange: setQuery,
        placeholder: strings.library.search,
      }}
      selectedId={selectedId}
    />
  )

  if (layout === 'compact') {
    return hasChild ? (
      <Outlet />
    ) : (
      <>
        <PageHeader title={strings.library.title} back={false} />
        {screen}
      </>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <div className="flex min-w-0 flex-1 flex-col">{screen}</div>
      {hasChild ? (
        <Panel title={panelTitle()} onClose={() => void navigate({ to: '/library' })}>
          <Outlet />
        </Panel>
      ) : null}
    </div>
  )
}
