import { useStrings } from '@ihsaanly/state/strings'
import { DiagnosticsScreen } from '@ihsaanly/ui/screens/diagnostics'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { PageHeader } from '~/components/page-header'
import { buildDiagnostics, type Diagnostics, downloadDiagnostics } from '~/data/export'

export const Route = createFileRoute('/_more/diagnostics')({ component: DiagnosticsRoute })

interface Thing {
  diagnostics: Diagnostics
  showingRaw: boolean
  message: string | null
}

function initial(): Thing {
  return { diagnostics: buildDiagnostics(), showingRaw: false, message: null }
}

/**
 * The mobile screen builds its bundle asynchronously (permission and queue
 * state cost a round trip there); on the web there is neither, so this can
 * build it once, synchronously, on first render.
 */
function DiagnosticsRoute(): ReactElement {
  const strings = useStrings()
  const router = useRouter()
  const [thing, setThing] = useState<Thing>(initial)

  const send = (): void => {
    try {
      downloadDiagnostics(thing.diagnostics)
      void router.history.back()
    } catch {
      setThing((current) => ({ ...current, message: strings.data.shareFailed }))
    }
  }

  return (
    <>
      <PageHeader title={strings.diagnostics.title} />
      <DiagnosticsScreen
        summary={{
          version: thing.diagnostics.app.version,
          device: `${thing.diagnostics.app.platform} · ${thing.diagnostics.app.device}`,
          coordinates: thing.diagnostics.coordinates,
          records: thing.diagnostics.data.events.length,
          settings: Object.keys(thing.diagnostics.data.preferences).length,
          reminders: { permission: 'unavailable', pending: 0 },
          failures: {
            count: thing.diagnostics.failures.length,
            latest: thing.diagnostics.failures.at(-1)?.at ?? null,
          },
          hasError: thing.diagnostics.lastStorageError !== null,
        }}
        raw={JSON.stringify(thing.diagnostics, null, 2)}
        showingRaw={thing.showingRaw}
        message={thing.message}
        onToggleRaw={() => setThing((current) => ({ ...current, showingRaw: !current.showingRaw }))}
        onSend={send}
        onCancel={() => router.history.back()}
      />
    </>
  )
}
