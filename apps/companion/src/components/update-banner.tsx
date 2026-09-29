// Shown once a new service worker has installed and is waiting to take over
// (see scripts/postbuild.ts's sw.js and src/register-sw.ts). Reload hands it
// control and refreshes; Dismiss just hides the banner for this visit.
import { useStrings } from '@ihsaanly/state/strings'
import { type ReactElement, useEffect, useState } from 'react'
import { onServiceWorkerUpdate } from '~/register-sw'

interface Thing {
  waiting: ServiceWorker | null
  dismissed: boolean
}

export function UpdateBanner(): ReactElement | null {
  const strings = useStrings()
  const [thing, setThing] = useState<Thing>({ waiting: null, dismissed: false })

  useEffect(() => {
    onServiceWorkerUpdate((worker) => setThing((current) => ({ ...current, waiting: worker })))
  }, [])

  const { waiting, dismissed } = thing
  if (!waiting || dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 border-system-separator border-t bg-system-secondary-background px-4 py-2 text-sm">
      <span>{strings.web.updateReady}</span>
      <div className="flex gap-3">
        <button
          type="button"
          className="font-semibold text-system-tint"
          onClick={() => {
            waiting.postMessage({ type: 'SKIP_WAITING' })
            waiting.addEventListener('statechange', () => window.location.reload())
          }}>
          {strings.web.reload}
        </button>
        <button
          type="button"
          className="text-system-secondary-label"
          onClick={() => setThing((current) => ({ ...current, dismissed: true }))}>
          {strings.web.dismiss}
        </button>
      </div>
    </div>
  )
}
