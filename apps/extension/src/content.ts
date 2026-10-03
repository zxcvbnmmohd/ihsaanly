// Downloaded content (packages/state/src/content). Opening the popup is the
// app starting: it installs the last good download before the first render
// (popup.tsx), then looks for a newer one for the next open, at most every six
// hours. Without VITE_CONTENT_URL it never checks and shows what it shipped with.
import { languageOf } from '@ihsaanly/core/i18n/locale'
import { startContentUpdates } from '@ihsaanly/state/content/updater'
import { getLocale } from '@ihsaanly/state/i18n/store'

/** Soon after the first paint: a popup is often open for only a few seconds. */
const POPUP_DELAY_MS = 250

/** Returns a stop function; a no-op without a content URL. */
export function startPopupContent(
  url: string | undefined = import.meta.env.VITE_CONTENT_URL,
): () => void {
  return startContentUpdates(url, () => languageOf(getLocale()), { delayMs: POPUP_DELAY_MS })
}
