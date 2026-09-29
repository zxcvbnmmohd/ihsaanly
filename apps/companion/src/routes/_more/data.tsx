import { eventsToAdd, parseExport } from '@ihsaanly/core/data/bundle'
import { wipe } from '@ihsaanly/state/storage/backend'
import { insertExportedEvents } from '@ihsaanly/state/storage/events'
import { useStrings } from '@ihsaanly/state/strings'
import { DataScreen } from '@ihsaanly/ui/screens/data'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { PageHeader } from '~/components/page-header'
import { buildExport, downloadExport } from '~/data/export'
import { confirmAction } from '~/platform/confirm'
import { pickFile } from '~/platform/pick-file'

export const Route = createFileRoute('/_more/data')({ component: DataRoute })

interface Thing {
  message: string | null
}

function DataRoute(): ReactElement {
  const strings = useStrings()
  const router = useRouter()
  const [thing, setThing] = useState<Thing>({ message: null })

  const say = (message: string | null): void => setThing({ message })

  const runExport = (): void => {
    try {
      downloadExport()
    } catch {
      say(strings.data.shareFailed)
    }
  }

  const runImport = (): void => {
    void pickFile('application/json')
      .then((text) => {
        if (text === null) return
        const parsed = parseExport(text)
        if (!parsed) return say(strings.data.importFailed)
        const added = insertExportedEvents(eventsToAdd(buildExport().events, parsed.events))
        say(strings.data.imported(added))
      })
      .catch(() => say(strings.data.importFailed))
  }

  const confirmDelete = (): void => {
    if (!confirmAction(`${strings.data.deleteConfirmTitle}\n\n${strings.data.deleteConfirmBody}`))
      return
    wipe()
    window.location.reload()
  }

  return (
    <>
      <PageHeader title={strings.data.title} />
      <DataScreen
        message={thing.message}
        onExport={runExport}
        onImport={runImport}
        onDiagnostics={() => void router.navigate({ href: '/diagnostics' })}
        onDelete={confirmDelete}
      />
    </>
  )
}
