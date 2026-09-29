// The popup shell: no tabs or sidebar (see apps/companion's root for those),
// no onboarding gate — Today asks for a location itself, which is all the
// planner needs. Reminders and the badge are refreshed from here, whatever route is open.
import { usePlace } from '@ihsaanly/state/location/store'
import { usePlan } from '@ihsaanly/state/plan/use-plan'
import { useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { EmptyState } from '@ihsaanly/ui/components/empty-state'
import { Screen } from '@ihsaanly/ui/components/screen'
import { useUi } from '@ihsaanly/ui/provider'
import { WebUiProvider } from '@ihsaanly/web/ui-provider'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import type { ReactElement, ReactNode } from 'react'
import { RouterLink } from '~/components/router-link'
import { useBadge, useQueuedDones, useReminderSync } from '~/reminders'
import { useExtensionStrings } from '~/strings'

export const Route = createRootRoute({ component: RootShell, notFoundComponent: NotFoundRoute })

function RootShell(): ReactElement {
  const strings = useExtensionStrings()
  const place = usePlace()
  useReminderSync(usePlan())
  useBadge(place, useCalculationPreferences(), strings)
  useQueuedDones(place?.timeZone ?? null)

  return (
    <WebUiProvider strings={strings} Link={RouterLink}>
      <main className="flex h-full min-h-0 flex-col">
        <Outlet />
      </main>
    </WebUiProvider>
  )
}

/** Library, glossary and memorise live in the full app; a link to one lands here. */
function NotFoundRoute(): ReactNode {
  const { strings, scheme } = useUi()
  return (
    <Screen palette={palettes[scheme]} className="grow items-center justify-center gap-4 p-6">
      <EmptyState message={strings.notFound.body} />
      <Link to="/" className="font-semibold text-system-tint">
        {strings.tabs.today}
      </Link>
    </Screen>
  )
}
