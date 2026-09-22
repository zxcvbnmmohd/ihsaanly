import { router } from 'expo-router'
import { useEffect, useState, type ReactElement } from 'react'

import { buildDiagnostics, shareDiagnostics, type Diagnostics } from '@/data/export'
import { summarise } from '@/data/summary'
import { DiagnosticsScreen } from '@/screens/diagnostics'
import { useStrings } from '@/strings'

interface Thing {
  diagnostics: Diagnostics | null
  showingRaw: boolean
  message: string | null
}

/**
 * The bundle is built once, when the screen opens, and that same object is
 * both shown and sent. Rebuilding it on send would let the two drift, which is
 * the thing this screen exists to prevent.
 *
 * Building it is asynchronous because the notification queue and the permission
 * state are, so the screen renders empty for a frame rather than showing a
 * bundle that is missing the part a reminder bug would turn on.
 */
export default function DiagnosticsRoute(): ReactElement {
  const strings = useStrings()
  const [thing, setThing] = useState<Thing>({
    diagnostics: null,
    showingRaw: false,
    message: null,
  })

  useEffect(() => {
    let cancelled = false
    void buildDiagnostics().then((diagnostics) => {
      if (!cancelled) setThing((current) => ({ ...current, diagnostics }))
    })
    return (): void => {
      cancelled = true
    }
  }, [])

  const send = (): void => {
    const { diagnostics } = thing
    if (!diagnostics) return

    void shareDiagnostics(diagnostics).then((shared) => {
      if (shared) return router.back()
      setThing((current) => ({ ...current, message: strings.data.shareFailed }))
    })
  }

  return (
    <DiagnosticsScreen
      summary={thing.diagnostics ? summarise(thing.diagnostics) : null}
      raw={thing.diagnostics ? JSON.stringify(thing.diagnostics, null, 2) : ''}
      showingRaw={thing.showingRaw}
      message={thing.message}
      onToggleRaw={() => setThing((current) => ({ ...current, showingRaw: !current.showingRaw }))}
      onSend={send}
      onCancel={() => router.back()}
    />
  )
}
