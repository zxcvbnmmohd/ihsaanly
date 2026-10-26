// Where to go once onboarding is done, when the summary asked for somewhere
// other than Today (a setting, About, the widget gallery). Onboarding replaces
// the tab bar, so nothing can be pushed while it shows: the flow leaves the
// path here and the root layout opens it once the tabs have mounted.
import { type Href, router } from 'expo-router'

interface Pending {
  path: string | null
}

const pending: Pending = { path: null }

export function openAfterOnboarding(path: string): void {
  pending.path = path
}

/**
 * Opens the path left by onboarding, once. A route this build lacks (the
 * widget gallery ships separately) lands on the not-found screen, which has
 * its own way back, rather than failing here.
 *
 * `withAnchor` puts the tab's own index under the destination. The tab's
 * stack has not mounted yet at this point, so a plain push made the setting
 * the only screen in it: More opened on Widgets with no Back and no way to
 * reach the list, and stayed that way until the app was restarted.
 */
export function openPendingDestination(): void {
  const path = pending.path
  pending.path = null
  if (path === null) return
  try {
    router.push(path as Href, { withAnchor: true })
  } catch {
    // The navigator was not ready; Today is still a fine place to start.
  }
}
