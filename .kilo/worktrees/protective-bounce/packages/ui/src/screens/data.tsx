import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text } from 'react-native'
import { useColors } from '../colors'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'

export interface DataScreenProps {
  message: string | null
  onExport: () => void
  onImport: () => void
  onDiagnostics: () => void
  onDelete: () => void
}

export function DataScreen({
  message,
  onExport,
  onImport,
  onDiagnostics,
  onDelete,
}: DataScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.data.explanation}
      </Text>

      <Row title={strings.data.export} detail={strings.data.exportDetail} onPress={onExport} />
      <Row title={strings.data.importing} detail={strings.data.importDetail} onPress={onImport} />
      <Row
        title={strings.data.diagnostics}
        detail={strings.data.diagnosticsDetail}
        onPress={onDiagnostics}
      />

      <Row title={strings.data.delete} detail={strings.data.deleteDetail} onPress={onDelete} />

      {message ? (
        <Text className="text-sm" style={{ color: colors.label }}>
          {message}
        </Text>
      ) : null}
    </Screen>
  )
}
