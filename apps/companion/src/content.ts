// Downloaded content (packages/state/src/content). The last good download is
// installed before the first render; a check for a newer one runs after it,
// and again whenever the tab comes back, for the next open. Without
// VITE_CONTENT_URL the app only ever shows the content it was built with.
import { languageOf } from '@ihsaanly/core/i18n/locale'
import { installCachedContent } from '@ihsaanly/state/content/cache'
import { notifyContentForeground, startContentUpdates } from '@ihsaanly/state/content/updater'
import { getLocale } from '@ihsaanly/state/i18n/store'

export { installCachedContent }

/** Starts the update checks; a no-op without a content URL. Returns a stop function. */
export function startCompanionContent(
  url: string | undefined = import.meta.env.VITE_CONTENT_URL,
): () => void {
  const stop = startContentUpdates(url, () => languageOf(getLocale()))
  if (!url?.trim()) return stop
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') notifyContentForeground()
  }
  document.addEventListener('visibilitychange', onVisible)
  return (): void => {
    document.removeEventListener('visibilitychange', onVisible)
    stop()
  }
}
