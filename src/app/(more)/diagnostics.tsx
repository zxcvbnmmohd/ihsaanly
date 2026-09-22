import { router } from 'expo-router'
import { useState, type ReactElement } from 'react'

import { buildDiagnostics, shareDiagnostics, type Diagnostics } from '@/data/export'
import { summarise } from '@/data/summary'
import { DiagnosticsScreen } from '@/screens/diagnostics'
import { useStrings } from '@/strings'

interface Thing {
  diagnostics: Diagnostics
  showingRaw: boolean
  message: string | null
}

/**
 * The bundle is built once, when the screen opens, and that same object is
 * both shown and sent. Rebuilding it on send would let the two drift, which is
 * the thing this screen exists to prevent.
 */
export default function DiagnosticsRoute(): ReactElement {
  const strings = useStrings()
  const [thing, setThing] = useState<Thing>(() => ({
    diagnostics: buildDiagnostics(),
    showingRaw: false,
    message: null,
  }))

  const send = (): void => {
    void shareDiagnostics(thing.diagnostics).then((shared) => {
      if (shared) return router.back()
      setThing((current) => ({ ...current, message: strings.data.shareFailed }))
    })
  }

  return (
    <DiagnosticsScreen
      summary={summarise(thing.diagnostics)}
      raw={JSON.stringify(thing.diagnostics, null, 2)}
      showingRaw={thing.showingRaw}
      message={thing.message}
      onToggleRaw={() => setThing((current) => ({ ...current, showingRaw: !current.showingRaw }))}
      onSend={send}
      onCancel={() => router.back()}
    />
  )
}
