// The mobile app gets its page title and back button from the native stack
// (see apps/mobile's per-group `_layout.tsx`, `<Stack.Screen options={{title}}/>`);
// a client-only SPA has no such chrome, so the routes that used to rely on it
// (everything but the three tabs) render this instead.
import { IconBack } from '@ihsaanly/web/icons'
import { useRouter } from '@tanstack/react-router'
import type { ReactElement, ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  /** The three tabs (Today, Library, More) have nothing to go back to. */
  back?: boolean
  /** Trailing actions, e.g. Today's link to settings. */
  children?: ReactNode
}

export function PageHeader({ title, back = true, children }: PageHeaderProps): ReactElement {
  const router = useRouter()
  return (
    <header className="flex flex-none items-center gap-3 border-system-separator border-b px-4 py-3">
      {back ? (
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Back"
          className="text-system-label">
          <IconBack />
        </button>
      ) : null}
      <h1 className="flex-1 truncate font-semibold text-lg text-system-label">{title}</h1>
      {children}
    </header>
  )
}
