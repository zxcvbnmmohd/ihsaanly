// Keeps <title> and the robots meta in step with the route. Runs once, in the
// root route (routes/__root.tsx).
import { useStrings } from '@ihsaanly/state/strings'
import { DEV_TITLE_PREFIX } from '@ihsaanly/web/app-env'
import { isDevelopmentBuild } from '@ihsaanly/web/development-badge'
import { useMatches, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { documentTitle, isIndexable, type TitledMatch } from './title'

// index.html's own title (already prefixed in a development build),
// read before any route changes it.
const DEFAULT_TITLE = typeof document === 'undefined' ? '' : document.title

const ROBOTS_ID = 'route-robots'

function setRobots(indexable: boolean): void {
  // A development build's static noindex, nofollow (index.html) already covers every route.
  if (isDevelopmentBuild) return
  const existing = document.getElementById(ROBOTS_ID)
  if (indexable) {
    existing?.remove()
    return
  }
  if (existing) return
  const meta = document.createElement('meta')
  meta.id = ROBOTS_ID
  meta.name = 'robots'
  meta.content = 'noindex'
  document.head.append(meta)
}

export function useDocumentHead(): void {
  const strings = useStrings()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Primitives, so the selectors only re-render on a real change.
  const routeId = useMatches({ select: (matches) => matches.at(-1)?.routeId ?? '__root__' })
  const id = useMatches({
    select: (matches) => (matches.at(-1)?.params as { id?: string } | undefined)?.id,
  })

  useEffect(() => {
    const match: TitledMatch = { routeId, params: { id } }
    const prefix = isDevelopmentBuild ? DEV_TITLE_PREFIX : ''
    document.title = documentTitle(match, strings, DEFAULT_TITLE || 'Ihsaanly', prefix)
    setRobots(isIndexable(pathname))
  }, [routeId, id, strings, pathname])
}
