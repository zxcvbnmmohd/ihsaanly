import { eventsToAdd, parseExport } from '@ihsaanly/core/data/bundle'
import { useAccount } from '@ihsaanly/state/cloud/session'
import { useCrashReports } from '@ihsaanly/state/opt-ins/store'
import { wipe } from '@ihsaanly/state/storage/backend'
import { insertExportedEvents } from '@ihsaanly/state/storage/events'
import { useStrings } from '@ihsaanly/state/strings'
import { DataScreen } from '@ihsaanly/ui/screens/data'
import { reloadAppAsync } from 'expo'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { router } from 'expo-router'
import { type ReactElement, useState } from 'react'
import { Alert } from 'react-native'
import { setCrashReporting } from '@/crash/crash'
import { buildExport, shareExport } from '@/data/export'

interface Thing {
  message: string | null
}

const MAX_IMPORT_BYTES = 8 * 1024 * 1024

export default function DataRoute(): ReactElement {
  const strings = useStrings()
  const signedIn = useAccount().account !== null
  const crashReports = useCrashReports()
  const [thing, setThing] = useState<Thing>({ message: null })

  const say = (message: string | null): void => setThing({ message })

  const runShare = (share: () => Promise<boolean>): void => {
    void share().then((shared) => say(shared ? null : strings.data.shareFailed))
  }

  const runImport = (): void => {
    void DocumentPicker.getDocumentAsync({ type: 'application/json' })
      .then((result) => {
        const asset = result.assets?.[0]
        if (result.canceled || !asset) return

        // The file is read whole and synchronously, so its size is checked before
        // it is opened rather than after. An export of a lifetime of practice is
        // orders of magnitude under this; anything above it is not one of ours.
        const file = new File(asset.uri)
        if ((file.size ?? 0) > MAX_IMPORT_BYTES) return say(strings.data.importFailed)

        const parsed = parseExport(file.textSync())
        if (!parsed) return say(strings.data.importFailed)

        const added = insertExportedEvents(eventsToAdd(buildExport().events, parsed.events))
        say(strings.data.imported(added))
      })
      .catch(() => {
        // An unreadable file throws rather than resolving, and without this the
        // rejection is silent and the screen simply never answers.
        say(strings.data.importFailed)
      })
  }

  const confirmDelete = (): void => {
    // Signed in, the account keeps its own copy: say so, and where that one is deleted.
    const body = signedIn ? strings.data.deleteConfirmBodySignedIn : strings.data.deleteConfirmBody
    Alert.alert(strings.data.deleteConfirmTitle, body, [
      { text: strings.data.cancel, style: 'cancel' },
      {
        text: strings.data.deleteConfirm,
        style: 'destructive',
        onPress: (): void => {
          wipe()
          void reloadAppAsync()
        },
      },
    ])
  }

  return (
    <DataScreen
      message={thing.message}
      onExport={() => runShare(shareExport)}
      onImport={runImport}
      onDiagnostics={() => router.push('/diagnostics')}
      onDelete={confirmDelete}
      crashReports={{ on: crashReports, onChange: (on) => void setCrashReporting(on) }}
    />
  )
}
