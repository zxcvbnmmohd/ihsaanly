import type { ShareCardText } from '@ihsaanly/core/content/share-text'
import type { Palette } from '@ihsaanly/tailwind/tokens'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { serif } from '../fonts'
import { ArabicText } from './arabic-text'

interface ShareCardProps {
  card: ShareCardText
  palette: Palette
}

/** A dua as a picture: the brand wash, the words, where they come from. Captured off-screen. */
export function ShareCard({ card, palette }: ShareCardProps): ReactElement {
  const colors = useColors()

  return (
    <LinearGradient
      colors={palette.wash}
      style={{ width: 360, padding: 28, gap: 18, borderRadius: 28 }}>
      <Text
        className="text-2xl leading-tight"
        style={{ color: colors.label, fontFamily: serif, fontWeight: '600' }}>
        {card.title}
      </Text>
      {card.arabic ? <ArabicText>{card.arabic}</ArabicText> : null}
      {card.transliteration ? (
        <Text className="text-sm italic" style={{ color: colors.secondaryLabel }}>
          {card.transliteration}
        </Text>
      ) : null}
      {card.translation ? (
        <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
          {card.translation}
        </Text>
      ) : null}
      <View className="flex-row items-end justify-between gap-3 pt-2">
        <Text className="flex-1 text-xs" style={{ color: colors.secondaryLabel }}>
          {card.source ?? ''}
        </Text>
        <Text className="font-semibold text-sm" style={{ color: palette.accent }}>
          Ihsaanly
        </Text>
      </View>
    </LinearGradient>
  )
}
