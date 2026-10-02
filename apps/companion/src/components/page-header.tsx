// The mobile app gets its page title and back button from the native stack
// (see apps/mobile's per-group `_layout.tsx`, `<Stack.Screen options={{title}}/>`);
// a client-only SPA has no such chrome, so the routes that used to rely on it
// (everything but the three tabs) render this instead.
//
// At regular/wide there is no back-button chrome at all: tab titles live in
// their screen or sidebar, panel titles come from Panel, and settings pages
// get an <h1> from the More layout — so every route can keep calling this
// unconditionally and it simply renders nothing outside `compact`.

import { useStrings } from '@ihsaanly/state/strings'
import { useLayout } from '@ihsaanly/ui/layout'
import { IconBack } from '@ihsaanly/web/icons'
import { useRouter } from '@tanstack/react-router'
import type { ReactElement } from 'react'

export interface PageHeaderProps {
  title: string
  /** The three tabs (Today, Library, More) have nothing to go back to. */
  back?: boolean
}

export function PageHeader({ title, back = true }: PageHeaderProps): ReactElement | null {
  const router = useRouter()
  const strings = useStrings()
  const layout = useLayout()
  if (layout !== 'compact') return null
  return (
    <header className="flex flex-none items-center gap-3 border-system-separator border-b px-4 py-3">
      {back ? (
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label={strings.onboarding.back}
          className="-my-2 -ms-2 inline-flex min-h-11 min-w-11 items-center justify-center text-system-label">
          <IconBack />
        </button>
      ) : null}
      <h1 className="truncate font-semibold text-lg text-system-label">{title}</h1>
    </header>
  )
}
