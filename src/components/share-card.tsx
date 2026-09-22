import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ArabicText } from '@/components/arabic-text'
import type { ShareCardText } from '@/content/share-text'
import { colors, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

interface ShareCardProps {
  card: ShareCardText
  palette: Palette
}

/** A dua as a picture: the brand wash, the words, where they come from. Captured off-screen. */
export function ShareCard({ card, palette }: ShareCardProps): ReactElement {
  useColorScheme()

  return (
    <LinearGradient
      colors={palette.wash}
      style={{ width: 360, padding: 28, gap: 18, borderRadius: 28 }}>
      <Text
        className="text-2xl leading-tight"
        style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
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
        <Text className="text-sm font-semibold" style={{ color: palette.accent }}>
          Ihsaanly
        </Text>
      </View>
    </LinearGradient>
  )
}
