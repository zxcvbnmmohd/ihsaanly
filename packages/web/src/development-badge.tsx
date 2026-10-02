// The marker a development (or extension beta) build wears, so a screenshot
// or an open tab is never mistaken for production. Renders nothing in a
// production build, where `isDevelopmentBuild` folds to false and the bundler
// drops it. The label is internal and stays English.
import type { ReactElement } from 'react'

/**
 * Whether this bundle is a development build. `import.meta.env.VITE_APP_ENV`
 * is always replaced by a literal (appEnvDefine in ./vite.ts), so a
 * production bundle folds this to `false` and drops whatever it guards. Under
 * Bun (tests) it reads the environment variable. Not for Node-side code: use
 * resolveAppEnv from ./app-env.ts there.
 */
export const isDevelopmentBuild: boolean = import.meta.env.VITE_APP_ENV === 'development'

// High contrast in both themes (black on yellow, ~15:1), pinned to the
// top-start corner (mirrors under RTL), small enough to sit inside a header's
// top padding, and never in the way of a tap.
const CORNER = 'pointer-events-none fixed start-0 top-0 z-[2147483647] rounded-ee-md print:hidden'
const BASE =
  'select-none bg-[#ffd60a] px-2 py-0.5 font-semibold text-[#111111] text-[0.7rem] uppercase leading-[1.4] tracking-[0.06em] [font-family:system-ui,sans-serif]'

export interface DevelopmentBadgeProps {
  /** "Development" on the web, "Beta" in the extension. */
  label?: string
  /** `corner` (default): fixed to the viewport's top-start corner; `inline`: a pill in the flow (e.g. a header). */
  placement?: 'corner' | 'inline'
}

export function DevelopmentBadge({ label, placement }: DevelopmentBadgeProps): ReactElement | null {
  if (!isDevelopmentBuild) return null
  // Defaulted after the guard, not in the parameters, so no trace of the
  // badge survives in a production bundle.
  const text = label ?? 'Development'
  return (
    <div
      role="note"
      aria-label={`${text} build`}
      className={`${BASE} ${placement === 'inline' ? 'flex-none rounded-full' : CORNER}`}>
      {text}
    </div>
  )
}
