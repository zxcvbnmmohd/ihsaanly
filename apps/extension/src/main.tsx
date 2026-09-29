// Same boot order as apps/companion/src/main.tsx: zod jitless before any schema
// parses (the extension CSP forbids `new Function` too), and the language and
// direction applied before the first paint.
import '@ihsaanly/web/zod-jitless'
import { setContentLanguage } from '@ihsaanly/core/content'
import { languageOf } from '@ihsaanly/core/i18n/locale'
import { startCloud } from '@ihsaanly/state/cloud/session'
import { applyDirection } from '@ihsaanly/state/i18n/direction'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { OPEN_ROUTE_KEY } from './alarms'
import { cloudEnabled, loadCloud } from './cloud'
import { router } from './router'
import './styles.css'

// Opened as a tab (a notification click where the popup could not open): drop the popup's fixed frame.
if (new URLSearchParams(location.search).has('tab')) document.documentElement.classList.add('tab')

setContentLanguage(languageOf(getLocale()))
applyDirection(getLocale())

// Opening the popup is the app starting: a returning account syncs now, the SDK loading only then.
// After a wipe the popup reloads so nothing stale stays in memory.
if (cloudEnabled) startCloud(loadCloud, { onWiped: () => location.reload() })

const root = document.getElementById('root')
if (!root) throw new Error('popup.html is missing #root')

createRoot(root).render(
  <StrictMode>
    <SafeAreaProvider>
      <RouterProvider router={router} />
    </SafeAreaProvider>
  </StrictMode>,
)

// A notification click opens the popup through background.ts and leaves the route to land on.
void chrome.storage.session.get(OPEN_ROUTE_KEY).then((stored) => {
  const route = stored[OPEN_ROUTE_KEY]
  if (typeof route !== 'string') return
  void chrome.storage.session.remove(OPEN_ROUTE_KEY)
  void router.navigate({ href: route })
})
