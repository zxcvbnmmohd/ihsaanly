import type { Strings } from '@ihsaanly/core/strings/en'
import { useMoreGroups } from '@ihsaanly/state/more/rows'
import { useStrings } from '@ihsaanly/state/strings'
import { useLayout } from '@ihsaanly/ui/layout'
import { filterGroups } from '@ihsaanly/ui/props/more'
import { MoreScreen } from '@ihsaanly/ui/screens/more'
import { storeValue } from '@ihsaanly/web/local-storage'
import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { cloudEnabled } from '~/cloud'
import { LAST_MORE_PAGE_KEY, MORE_PATHS, type MorePath } from '~/more/last-page'
import { useThemePreference } from '~/theme/store'

export const Route = createFileRoute('/_more')({ component: MoreRoute })

interface Thing {
  query: string
}

function isMorePath(value: string): value is MorePath {
  return (MORE_PATHS as readonly string[]).includes(value)
}

/** The h1 the layout renders above each settings child at regular/wide. */
function titleFor(path: MorePath, strings: Strings): string {
  switch (path) {
    case '/about':
      return strings.about.title
    case '/account':
      return strings.account.title
    case '/appearance':
      return strings.appearance.title
    case '/calculation':
      return strings.calculation.title
    case '/data':
      return strings.data.title
    case '/diagnostics':
      return strings.diagnostics.title
    case '/events':
      return strings.events.title
    case '/feedback':
      return strings.feedback.title
    case '/hijri':
      return strings.hijri.title
    case '/history':
      return strings.history.title
    case '/language':
      return strings.language.title
    case '/location':
      return strings.location.title
    case '/notifications':
      return strings.notifications.title
    case '/qada':
      return strings.qada.title
    case '/tracking':
      return strings.tracking.title
  }
}

function MoreRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ query: '' })
  const strings = useStrings()
  const layout = useLayout()
  const theme = useThemePreference()
  const groups = useMoreGroups(theme, cloudEnabled)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const restoring = useRouterState({
    select: (state) => state.location.search.from === 'onboarding',
  })
  const hasChild = isMorePath(pathname)

  // Remembered once here, not by each of the settings children —
  // read back by routes/_more/more.tsx's beforeLoad redirect.
  useEffect(() => {
    if (hasChild) storeValue(LAST_MORE_PAGE_KEY, pathname)
  }, [hasChild, pathname])

  const list = (
    <MoreScreen
      groups={filterGroups(groups, thing.query)}
      searchable={{
        query: thing.query,
        onQueryChange: (query) => setThing({ query }),
        placeholder: strings.more.search,
      }}
      selectedHref={hasChild ? pathname : null}
    />
  )

  if (layout === 'compact') return hasChild ? <Outlet /> : list
  // Account opened from onboarding stands alone: nothing in this list is open yet.
  if (restoring) return <Outlet />

  const title = hasChild && isMorePath(pathname) ? titleFor(pathname, strings) : ''

  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <div className="flex w-85 flex-none flex-col border-system-separator border-e">{list}</div>
      {/* A flex column, so the page's Screen (flex: 1) fills the height and its
          wash reaches the bottom; wash-top behind the h1 joins the gradient. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-wash-top">
        {title ? (
          <h1 className="px-6 pt-6 font-semibold font-serif text-2xl text-system-label">{title}</h1>
        ) : null}
        <Outlet />
      </div>
    </div>
  )
}
