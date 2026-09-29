// Android's half of app detection (see @ihsaanly/web/app-links): iOS gets the
// browser's own Smart App Banner from a <meta> tag, dormant while there is no
// App Store id. Android has no such thing, so this draws one: shown only in
// a normal browser tab (not once the page is already installed), dismissible,
// remembered for next time.

import { useStrings } from '@ihsaanly/state/strings'
import { intentUrl, platformOf } from '@ihsaanly/web/app-links'
import { readStored, storeValue } from '@ihsaanly/web/local-storage'
import { useRouterState } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'

const DISMISSED_KEY = 'ihsaanly.app-banner-dismissed'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

interface Thing {
  dismissed: boolean
}

export function AppBanner(): ReactElement | null {
  const strings = useStrings()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [thing, setThing] = useState<Thing>(() => ({
    dismissed: readStored(DISMISSED_KEY) === '1',
  }))

  const shouldShow =
    platformOf(navigator.userAgent) === 'android' && !isStandalone() && !thing.dismissed

  if (!shouldShow) return null

  return (
    <div className="flex items-center justify-between gap-3 border-system-separator border-b bg-system-secondary-background px-4 py-2 text-sm">
      <a href={intentUrl(pathname)} className="font-semibold text-accent">
        {strings.web.openInApp}
      </a>
      <button
        type="button"
        aria-label={strings.web.dismiss}
        onClick={() => {
          storeValue(DISMISSED_KEY, '1')
          setThing({ dismissed: true })
        }}
        className="text-system-secondary-label">
        ✕
      </button>
    </div>
  )
}
