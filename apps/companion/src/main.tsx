// Order matters: zod must be jitless before any schema parses (the CSP
// forbids `new Function`), downloaded content is installed before anything
// reads it, and the language/direction must be applied before the first
// paint, same as apps/mobile/src/app/_layout.tsx does natively.
import '@ihsaanly/web/zod-jitless'
import { setContentLanguage } from '@ihsaanly/core/content'
import { languageOf } from '@ihsaanly/core/i18n/locale'
import { applyDirection } from '@ihsaanly/state/i18n/direction'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { startProgress } from '@ihsaanly/state/progress/configure'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { startCompanionCloud } from './cloud'
import { installCachedContent, startCompanionContent } from './content'
import { registerServiceWorker } from './register-sw'
import { router } from './router'
import './styles.css'

// Before anything reads the content: the last good download, else what shipped.
installCachedContent()
setContentLanguage(languageOf(getLocale()))
applyDirection(getLocale())
startProgress()
startCompanionCloud()

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing #root')

createRoot(root).render(
  <StrictMode>
    {/* packages/ui's onboarding screen reads safe-area insets (react-native-safe-area-context's
        web implementation reads the CSS env(safe-area-inset-*) values). */}
    <SafeAreaProvider>
      <RouterProvider router={router} />
    </SafeAreaProvider>
  </StrictMode>,
)

startCompanionContent()

if (import.meta.env.PROD) registerServiceWorker()
