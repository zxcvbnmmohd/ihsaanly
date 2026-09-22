import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Button } from '@/components/button'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import { formatCoordinates, type DiagnosticsSummary } from '@/data/summary'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface DiagnosticsScreenProps {
  summary: DiagnosticsSummary
  /** The bundle as it will be sent, so what is shown and what leaves cannot differ. */
  raw: string
  showingRaw: boolean
  message: string | null
  onToggleRaw: () => void
  onSend: () => void
  onCancel: () => void
}

export function DiagnosticsScreen({
  summary,
  raw,
  showingRaw,
  message,
  onToggleRaw,
  onSend,
  onCancel,
}: DiagnosticsScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.diagnostics.explanation}
      </Text>

      <View className="gap-3">
        <Row title={strings.diagnostics.version} detail={summary.version} />
        <Row title={strings.diagnostics.device} detail={summary.device} />
        <Row
          title={strings.diagnostics.coordinates}
          detail={
            summary.coordinates
              ? formatCoordinates(summary.coordinates)
              : strings.diagnostics.noCoordinates
          }
        />
        <Row title={strings.diagnostics.records} detail={String(summary.records)} />
        <Row title={strings.diagnostics.settings} detail={String(summary.settings)} />
        {summary.hasError ? (
          <Row title={strings.diagnostics.error} detail={strings.diagnostics.errorIncluded} />
        ) : null}
      </View>

      <Row
        title={showingRaw ? strings.diagnostics.hideRaw : strings.diagnostics.showRaw}
        onPress={onToggleRaw}
      />

      {showingRaw ? (
        <Surface>
          <View className="p-3">
            <Text selectable className="font-mono text-xs" style={{ color: colors.secondaryLabel }}>
              {raw}
            </Text>
          </View>
        </Surface>
      ) : null}

      <View className="gap-3">
        <Button
          title={strings.diagnostics.send}
          onPress={onSend}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        <Button
          title={strings.diagnostics.cancel}
          variant="secondary"
          onPress={onCancel}
          color={palette.accent}
          onColor={palette.onAccent}
        />
      </View>

      {message ? (
        <Text className="text-sm" style={{ color: colors.label }}>
          {message}
        </Text>
      ) : null}
    </Screen>
  )
}
