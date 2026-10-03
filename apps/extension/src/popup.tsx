import { setContentLanguage } from '@ihsaanly/core/content'
import { languageOf } from '@ihsaanly/core/i18n/locale'
import { notifyBackground, startCloud } from '@ihsaanly/state/cloud/session'
import { installCachedContent } from '@ihsaanly/state/content/cache'
import { applyDirection } from '@ihsaanly/state/i18n/direction'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { startProgress } from '@ihsaanly/state/progress/configure'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { OPEN_ROUTE_KEY } from './alarms'
import { cloudEnabled, loadCloud } from './cloud'
import { startPopupContent } from './content'
import { router } from './router'

/** Boots the popup into `container` (popup.html's #root); main.tsx is the entry that calls it. */
export function startPopup(container: HTMLElement | null): Root {
  // Opened as a tab (a notification click where the popup could not open): drop the popup's fixed frame.
  if (new URLSearchParams(location.search).has('tab')) document.documentElement.classList.add('tab')

  // Before anything reads the content: the last good download, else what shipped.
  installCachedContent()
  setContentLanguage(languageOf(getLocale()))
  applyDirection(getLocale())

  // Opening the popup is the app starting: a returning account syncs now, the SDK loading only then.
  // After a wipe the popup reloads so nothing stale stays in memory.
  if (cloudEnabled) {
    startCloud(loadCloud, { onWiped: () => location.reload() })
    // A closing popup stops listening; opening one is the foreground, which startCloud already is.
    window.addEventListener('pagehide', notifyBackground)
  }

  // Marks on Today are counted per period; the periods come from the saved place and prayer times.
  startProgress()

  if (!container) throw new Error('popup.html is missing #root')

  const root = createRoot(container)
  root.render(
    <StrictMode>
      <SafeAreaProvider>
        <RouterProvider router={router} />
      </SafeAreaProvider>
    </StrictMode>,
  )

  // Newer content, downloaded for the next open.
  startPopupContent()

  // A notification click opens the popup through background.ts and leaves the route to land on.
  void chrome.storage.session.get(OPEN_ROUTE_KEY).then((stored) => {
    const route = stored[OPEN_ROUTE_KEY]
    if (typeof route !== 'string') return
    void chrome.storage.session.remove(OPEN_ROUTE_KEY)
    void router.navigate({ href: route })
  })

  return root
}
