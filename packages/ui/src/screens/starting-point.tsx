import { STARTER_PRESETS, type StarterPreset } from '@ihsaanly/core/plan/presets'
import type { ReactElement } from 'react'
import { Text } from 'react-native'
import { useColors, usePalette } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'

export interface StartingPointScreenProps {
  /** The preset the Library's enabled items equal, or null once edited by hand. */
  current: StarterPreset | null
  onSelect: (preset: StarterPreset) => void
}

/** Onboarding's last step, offered again from More. */
export function StartingPointScreen({ current, onSelect }: StartingPointScreenProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const palette = usePalette()
  const copy = strings.startingPoint
  const detail: Record<StarterPreset, string> = {
    starting: copy.startingDetail,
    essentials: copy.essentialsDetail,
    everything: copy.everythingDetail,
  }

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {copy.why}
      </Text>

      {STARTER_PRESETS.map((preset) => (
        <ChoiceRow
          key={preset}
          title={strings.onboarding[preset]}
          detail={detail[preset]}
          selected={current === preset}
          onPress={() => onSelect(preset)}
          accent={palette.accent}
        />
      ))}

      {current === null ? (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {copy.customNote}
        </Text>
      ) : null}
    </Screen>
  )
}
