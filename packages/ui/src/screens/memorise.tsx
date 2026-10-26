import { REPEATS, type Repeat, SPEEDS, type Speed } from '@ihsaanly/core/memorise/recitation'
import type { Reveal } from '@ihsaanly/core/memorise/reveal'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { ArabicText } from '../components/arabic-text'
import { Chip } from '../components/chip'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { useUi } from '../provider'

export interface MemoriseScreenProps {
  arabic: string | null
  transliteration: string | null
  translation: string | null
  reveal: Reveal
  known: boolean
  hasAudio: boolean
  playing: boolean
  speed: Speed
  repeat: Repeat
  onHideOne: () => void
  onTogglePlay: () => void
  onSpeed: (speed: Speed) => void
  onRepeat: (repeat: Repeat) => void
  onToggleKnown: () => void
}

interface ChipGroupProps {
  label: string
  children: ReactNode
}

function ChipGroup({ label, children }: ChipGroupProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-2">
      <Text className="font-semibold text-xs uppercase" style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  )
}

function repeatLabel(repeat: Repeat, strings: Strings['memorise']): string {
  if (repeat === 'always') return strings.repeatAlways
  if (repeat === 1) return strings.repeatOff
  return strings.repeatTimes(repeat)
}

export function MemoriseScreen(props: MemoriseScreenProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const palette = usePalette()

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {props.arabic ? (
        <Surface style={{ borderRadius: 24, padding: 22 }}>
          <View className="items-center gap-3">
            <ArabicText variant="hero">{props.arabic}</ArabicText>
            {props.reveal.transliteration && props.transliteration ? (
              <Text
                className="text-center text-base italic"
                style={{ color: colors.secondaryLabel }}>
                {props.transliteration}
              </Text>
            ) : null}
            {props.reveal.translation && props.translation ? (
              <Text className="text-center text-base" style={{ color: colors.secondaryLabel }}>
                {props.translation}
              </Text>
            ) : null}
          </View>
        </Surface>
      ) : null}

      <View className="gap-3">
        {props.hasAudio ? (
          <>
            <Row
              title={props.playing ? strings.memorise.stop : strings.memorise.play}
              onPress={props.onTogglePlay}
            />
            <ChipGroup label={strings.memorise.speed}>
              {SPEEDS.map((speed) => (
                <Chip
                  key={speed}
                  label={strings.memorise.rate(speed)}
                  selected={props.speed === speed}
                  onPress={() => props.onSpeed(speed)}
                  palette={palette}
                />
              ))}
            </ChipGroup>
            <ChipGroup label={strings.memorise.loop}>
              {REPEATS.map((repeat) => (
                <Chip
                  key={repeat}
                  label={repeatLabel(repeat, strings.memorise)}
                  selected={props.repeat === repeat}
                  onPress={() => props.onRepeat(repeat)}
                  palette={palette}
                />
              ))}
            </ChipGroup>
          </>
        ) : (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.memorise.noAudio}
          </Text>
        )}

        <Row title={strings.memorise.hide} onPress={props.onHideOne} />
        <Row
          title={props.known ? strings.memorise.known : strings.memorise.notKnown}
          detail={strings.memorise.knownDetail}
          selected={props.known}
          onPress={props.onToggleKnown}
        />
      </View>
    </Screen>
  )
}
