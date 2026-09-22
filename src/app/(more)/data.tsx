import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { reloadAppAsync } from 'expo'
import { useState, type ReactElement } from 'react'
import { Alert } from 'react-native'

import { router } from 'expo-router'

import { eventsToAdd, parseExport } from '@/data/bundle'
import { buildExport, shareExport } from '@/data/export'
import { DataScreen } from '@/screens/data'
import { useStrings } from '@/strings'
import { wipe } from '@/storage/database'
import { insertExportedEvents } from '@/storage/events'

interface Thing {
  message: string | null
}

const MAX_IMPORT_BYTES = 8 * 1024 * 1024

export default function DataRoute(): ReactElement {
  const strings = useStrings()
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
    Alert.alert(strings.data.deleteConfirmTitle, strings.data.deleteConfirmBody, [
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
    />
  )
}
