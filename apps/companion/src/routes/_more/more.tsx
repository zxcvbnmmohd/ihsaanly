// The `/more` URL itself. At regular/wide there is always a settings page
// selected, so this redirects to the last-used one (or the first row) before
// anything renders. At compact, no redirect happens and the parent layout
// (routes/_more/route.tsx) shows the list in its place — see `hasChild`.
import { layoutFor } from '@ihsaanly/ui/layout'
import { readStored } from '@ihsaanly/web/local-storage'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { LAST_MORE_PAGE_KEY, MORE_PATHS, type MorePath } from '~/more/last-page'

function isMorePath(value: string | null): value is MorePath {
  return value !== null && (MORE_PATHS as readonly string[]).includes(value)
}

export const Route = createFileRoute('/_more/more')({
  beforeLoad: () => {
    if (layoutFor(window.innerWidth) === 'compact') return
    const stored = readStored(LAST_MORE_PAGE_KEY)
    throw redirect({ to: isMorePath(stored) ? stored : '/location', replace: true })
  },
  component: () => null,
})
