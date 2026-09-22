import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ArabicText } from '@/components/arabic-text'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { Reveal } from '@/memorise/reveal'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

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
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-6 p-4">
      {props.arabic ? <ArabicText>{props.arabic}</ArabicText> : null}

      {props.reveal.transliteration && props.transliteration ? (
        <Text className="text-base italic" style={{ color: colors.secondaryLabel }}>
          {props.transliteration}
        </Text>
      ) : null}

      {props.reveal.translation && props.translation ? (
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {props.translation}
        </Text>
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
