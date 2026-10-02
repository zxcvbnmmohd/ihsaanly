// The app shell: onboarding gate (a redirect: every screen has its own URL,
// the flow's steps included, see routes/onboarding/$step.tsx), then the real
// app behind a bottom tab bar (<768px) or a left sidebar (>=768px, `border-e`
// so it mirrors under RTL). @ihsaanly/ui's <Screen> already caps and centers
// its own content at 720px, so this only has to give it a flexed region to
// grow into (see src/styles.css) and never constrains its width itself.

import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import { useStrings } from '@ihsaanly/state/strings'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { EmptyState } from '@ihsaanly/ui/components/empty-state'
import { Screen } from '@ihsaanly/ui/components/screen'
import { useUi } from '@ihsaanly/ui/provider'
import { DevelopmentBadge } from '@ihsaanly/web/development-badge'
import { BrandMark, IconLibrary, IconMore, IconToday } from '@ihsaanly/web/icons'
import { WebUiProvider } from '@ihsaanly/web/ui-provider'
import {
  createRootRoute,
  Outlet,
  redirect,
  useMatches,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { AppBanner } from '~/components/app-banner'
import { isPlainLeftClick, RouterLink } from '~/components/router-link'
import { UpdateBanner } from '~/components/update-banner'
import { useDocumentHead } from '~/head/use-document-head'

const ONBOARDING = '/onboarding'
const ACCOUNT = '/account'

/** On /account from onboarding's "Sign in to restore": still part of the flow, so no tabs. */
function isRestoring(location: { pathname: string; search: Record<string, unknown> }): boolean {
  return location.pathname === ACCOUNT && location.search.from === 'onboarding'
}

export const Route = createRootRoute({
  // Until onboarding is done, any app URL (a shared /item/… link included)
  // lands on its first step. The step routes do the reverse check.
  beforeLoad: ({ location }) => {
    if (location.pathname === '/' || location.pathname.startsWith(ONBOARDING)) return
    // Signing in to restore an existing account is the other way through it.
    if (location.pathname === ACCOUNT) return
    if (!getOnboarding().completed)
      throw redirect({ to: '/onboarding/$step', params: { step: 'welcome' }, replace: true })
  },
  component: RootShell,
  notFoundComponent: NotFoundRoute,
})

// Library's and More's own layout routes (routes/_library/route.tsx,
// routes/_more/route.tsx) — pathless, so they carry no URL segment of their
// own, but every child match includes them, which is what makes them a
// reliable "which tab" signal regardless of which child page is open.
const LIBRARY_LAYOUT_ROUTE_ID = '/_library'
const MORE_LAYOUT_ROUTE_ID = '/_more'

interface Tab {
  href: '/today' | '/library' | '/more'
  labelKey: 'today' | 'library' | 'more'
  Icon: ComponentType
  isActive: (pathname: string, layoutRouteIds: Set<string>) => boolean
}

const TABS: Tab[] = [
  {
    href: '/today',
    labelKey: 'today',
    Icon: IconToday,
    isActive: (path) => path === '/today',
  },
  {
    href: '/library',
    labelKey: 'library',
    Icon: IconLibrary,
    isActive: (_path, layoutRouteIds) => layoutRouteIds.has(LIBRARY_LAYOUT_ROUTE_ID),
  },
  {
    href: '/more',
    labelKey: 'more',
    Icon: IconMore,
    isActive: (_path, layoutRouteIds) => layoutRouteIds.has(MORE_LAYOUT_ROUTE_ID),
  },
]

function useActivePathname(): string {
  return useRouterState({ select: (state) => state.location.pathname })
}

/** The set of matched route ids for the current URL, layout routes included. */
function useActiveLayoutRouteIds(): Set<string> {
  return useMatches({ select: (matches) => new Set(matches.map((match) => match.routeId)) })
}

interface NavAnchorProps {
  href: string
  className: string
  active?: boolean
  children: ReactNode
}

/** A real `<a href>`, handed to the client router on a plain click — see src/components/router-link.tsx. */
function NavAnchor({ href, className, active, children }: NavAnchorProps): ReactElement {
  const router = useRouter()
  return (
    <a
      href={href}
      className={className}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        if (!isPlainLeftClick(event)) return
        event.preventDefault()
        void router.navigate({ href })
      }}>
      {children}
    </a>
  )
}

function SidebarNav(): ReactElement {
  const strings = useStrings()
  const pathname = useActivePathname()
  const layoutRouteIds = useActiveLayoutRouteIds()
  return (
    <nav className="hidden w-56 flex-none flex-col gap-1 border-system-separator border-e p-4 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2 text-system-label">
        <BrandMark />
        <span className="font-semibold text-lg">Ihsaanly</span>
      </div>
      {TABS.map(({ href, labelKey, Icon, isActive }) => {
        const active = isActive(pathname, layoutRouteIds)
        return (
          <NavAnchor
            key={href}
            href={href}
            active={active}
            className={`flex items-center gap-3 rounded-full px-3 py-2 text-sm ${
              active
                ? 'font-semibold text-accent'
                : 'text-system-secondary-label hover:text-system-label'
            }`}>
            <Icon />
            {strings.tabs[labelKey]}
          </NavAnchor>
        )
      })}
    </nav>
  )
}

function BottomTabs(): ReactElement {
  const strings = useStrings()
  const pathname = useActivePathname()
  const layoutRouteIds = useActiveLayoutRouteIds()
  return (
    <nav className="flex flex-none items-stretch justify-around border-system-separator border-t bg-system-secondary-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({ href, labelKey, Icon, isActive }) => {
        const active = isActive(pathname, layoutRouteIds)
        return (
          <NavAnchor
            key={href}
            href={href}
            active={active}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
              active ? 'text-accent' : 'text-system-secondary-label'
            }`}>
            <Icon />
            {strings.tabs[labelKey]}
          </NavAnchor>
        )
      })}
    </nav>
  )
}

function AppShell(): ReactElement {
  return (
    <div className="flex h-full flex-col">
      <AppBanner />
      <div className="flex min-h-0 flex-1 md:flex-row">
        <SidebarNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </main>
          <UpdateBanner />
          <BottomTabs />
        </div>
      </div>
    </div>
  )
}

function RootShell(): ReactElement {
  const strings = useStrings()
  useDocumentHead()
  const inOnboarding = useRouterState({
    select: (state) =>
      state.location.pathname.startsWith(ONBOARDING) || isRestoring(state.location),
  })

  return (
    <WebUiProvider strings={strings} Link={RouterLink}>
      {inOnboarding ? <Outlet /> : <AppShell />}
      <DevelopmentBadge />
    </WebUiProvider>
  )
}

/**
 * Rendered inside the root's own Outlet (see AppShell above), so the tab bar
 * or sidebar stays visible around it — `useUi()` already has a provider
 * above it and does not need a second one.
 */
function NotFoundRoute(): ReactNode {
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  return (
    <Screen palette={palette} className="grow items-center justify-center gap-4 p-6">
      <EmptyState message={strings.notFound.body} />
      <NavAnchor href="/today" className="font-semibold text-accent">
        {strings.tabs.today}
      </NavAnchor>
    </Screen>
  )
}
