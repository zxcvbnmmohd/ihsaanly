import type { ShareCardText } from '@ihsaanly/core/content/share-text'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { serif } from '../fonts'
import {
  type ShareAspect,
  type ShareBackground,
  type ShareCardFit,
  type ShareCardTheme,
  shareCardFit,
  shareCardSize,
} from '../props/share-card'
import { ArabicText } from './arabic-text'

/** The address on every card, small, so a shared picture says where it came from. */
export const SHARE_WATERMARK = 'ihsaanly.app'

interface ShareCardProps {
  card: ShareCardText
  theme: ShareCardTheme
  background: ShareBackground
  aspect: ShareAspect
}

const TYPE: Record<
  ShareCardFit,
  { title: string; arabic: string; transliteration: string; translation: string }
> = {
  regular: {
    title: 'text-2xl leading-tight',
    arabic: 'text-3xl leading-loose',
    transliteration: 'text-base',
    translation: 'text-lg leading-relaxed',
  },
  compact: {
    title: 'text-xl leading-tight',
    arabic: 'text-2xl leading-loose',
    transliteration: 'text-sm',
    translation: 'text-base leading-relaxed',
  },
  small: {
    title: 'text-lg leading-tight',
    arabic: 'text-xl leading-relaxed',
    transliteration: 'text-xs',
    translation: 'text-sm leading-snug',
  },
}

/**
 * A dua as a picture: the words, where they come from and the watermark, at a
 * fixed story (9:16) or square size. Full bleed, so a solid card has no
 * transparent corners; a transparent one draws no background at all and
 * becomes a sticker. The host captures it off-screen.
 */
export function ShareCard({ card, theme, background, aspect }: ShareCardProps): ReactElement {
  const type = TYPE[shareCardFit(card, aspect)]
  const size = shareCardSize(aspect)
  const frame = {
    ...size,
    padding: aspect === 'story' ? 36 : 28,
    gap: aspect === 'story' ? 20 : 12,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  }

  const body: ReactNode = (
    <>
      <Text
        className={`text-center ${type.title}`}
        style={{ color: theme.ink, fontFamily: serif, fontWeight: '600' }}>
        {card.title}
      </Text>
      {card.arabic ? (
        <ArabicText variant="hero" className={type.arabic} color={theme.ink}>
          {card.arabic}
        </ArabicText>
      ) : null}
      {card.transliteration ? (
        <Text
          className={`text-center italic ${type.transliteration}`}
          style={{ color: theme.inkSecondary }}>
          {card.transliteration}
        </Text>
      ) : null}
      {card.translation ? (
        <Text className={`text-center ${type.translation}`} style={{ color: theme.ink }}>
          {card.translation}
        </Text>
      ) : null}
      <View className="items-center gap-1 pt-2">
        {card.source ? (
          <Text className="text-center text-xs" style={{ color: theme.inkSecondary }}>
            {card.source}
          </Text>
        ) : null}
        <Text
          className="font-semibold text-xs"
          style={{ color: theme.accent, opacity: 0.75, letterSpacing: 0.5 }}>
          {SHARE_WATERMARK}
        </Text>
      </View>
    </>
  )

  if (background === 'transparent') {
    return (
      <View testID="share-card" style={frame}>
        {body}
      </View>
    )
  }

  return (
    <LinearGradient testID="share-card" colors={theme.wash} style={frame}>
      {body}
    </LinearGradient>
  )
}
