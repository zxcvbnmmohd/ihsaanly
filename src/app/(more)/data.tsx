import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { reloadAppAsync } from 'expo'
import { useState, type ReactElement } from 'react'
import { Alert } from 'react-native'

import { eventsToAdd, parseExport } from '@/data/bundle'
import { buildExport, shareDiagnostics, shareExport } from '@/data/export'
import { DataScreen } from '@/screens/data'
import { useStrings } from '@/strings'
import { wipe } from '@/storage/database'
import { insertExportedEvents } from '@/storage/events'

interface Thing {
  message: string | null
}

export default function DataRoute(): ReactElement {
  const strings = useStrings()
  const [thing, setThing] = useState<Thing>({ message: null })

  const say = (message: string | null): void => setThing({ message })

  const runShare = (share: () => Promise<boolean>): void => {
    void share().then((shared) => say(shared ? null : strings.data.shareFailed))
  }

  const runImport = (): void => {
    void DocumentPicker.getDocumentAsync({ type: 'application/json' }).then((result) => {
      const asset = result.assets?.[0]
      if (result.canceled || !asset) return

      const parsed = parseExport(new File(asset.uri).textSync())
      if (!parsed) return say(strings.data.importFailed)

      const added = insertExportedEvents(eventsToAdd(buildExport().events, parsed.events))
      say(strings.data.imported(added))
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
      onDiagnostics={() => runShare(shareDiagnostics)}
      onDelete={confirmDelete}
    />
  )
}
