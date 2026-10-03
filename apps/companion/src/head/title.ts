// The tab title per route, from the same localized screen titles the pages
// show in their PageHeader, so it is decided once here (in the root route)
// instead of in every route file. The canonical, Open Graph and default
// description tags are static in index.html: marketing is the SEO surface,
// the companion only needs to be described well and indexed at its door.
import { itemById, resolveText } from '@ihsaanly/core/content'
import type { Strings } from '@ihsaanly/core/strings/en'

const BRAND = 'Ihsaanly'

/** The deepest route that names its own page (a layout route never does). */
export interface TitledMatch {
  routeId: string
  params: Record<string, string | undefined>
}

const SCREEN: Record<string, (strings: Strings) => string> = {
  '/today': (s) => s.today.title,
  '/_library/library': (s) => s.library.title,
  '/_library/glossary': (s) => s.glossary.title,
  '/_library/item/memorise/$id': (s) => s.memorise.title,
  '/_more/more': (s) => s.more.title,
  '/_more/about': (s) => s.about.title,
  '/_more/account': (s) => s.account.title,
  '/_more/appearance': (s) => s.appearance.title,
  '/_more/calculation': (s) => s.calculation.title,
  '/_more/data': (s) => s.data.title,
  '/_more/diagnostics': (s) => s.diagnostics.title,
  '/_more/events': (s) => s.events.title,
  '/_more/feedback': (s) => s.feedback.title,
  '/_more/hijri': (s) => s.hijri.title,
  '/_more/history': (s) => s.history.title,
  '/_more/language': (s) => s.language.title,
  '/_more/location': (s) => s.location.title,
  '/_more/notifications': (s) => s.notifications.title,
  '/_more/qada': (s) => s.qada.title,
  '/_more/tracking': (s) => s.tracking.title,
}

/** The page's own name, or null where the document's default title stands (onboarding, the door). */
function screenTitle(match: TitledMatch | undefined, strings: Strings): string | null {
  if (!match || match.routeId === '__root__') return strings.notFound.title
  if (match.routeId === '/_library/item/$id') {
    const item = itemById(match.params.id ?? '')
    return item ? resolveText(item.title) : strings.notFound.title
  }
  return SCREEN[match.routeId]?.(strings) ?? null
}

/**
 * "Library · Ihsaanly", "<item title> · Ihsaanly"; `fallback` (index.html's
 * own title) where the route names no page. `prefix` marks a development
 * build (DEV_TITLE_PREFIX).
 */
export function documentTitle(
  match: TitledMatch | undefined,
  strings: Strings,
  fallback: string,
  prefix = '',
): string {
  const screen = screenTitle(match, strings)
  if (screen === null) return fallback
  return `${prefix}${screen} · ${BRAND}`
}

/**
 * The URLs a crawler may index: the door and the first onboarding step it
 * redirects a new visitor to. Everything else is the app itself, personal
 * and empty to a crawler, so it gets `noindex` (set client-side: the host
 * serves one index.html for every path, and Google renders the script).
 */
export function isIndexable(pathname: string): boolean {
  return pathname === '/' || pathname === '/onboarding/welcome'
}
