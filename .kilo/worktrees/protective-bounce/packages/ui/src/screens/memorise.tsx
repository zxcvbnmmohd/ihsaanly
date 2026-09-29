import type { Reveal } from '@ihsaanly/core/memorise/reveal'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { ArabicText } from '../components/arabic-text'
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
  looping: boolean
  onHideOne: () => void
  onTogglePlay: () => void
  onToggleLoop: () => void
  onToggleKnown: () => void
}

export function MemoriseScreen(props: MemoriseScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

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
            <Row
              title={strings.memorise.loop}
              selected={props.looping}
              onPress={props.onToggleLoop}
            />
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
