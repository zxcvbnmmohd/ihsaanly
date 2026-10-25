import type { ShareCardText } from '@ihsaanly/core/content/share-text'
import type { Palette } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { useColors } from '../colors'
import {
  SHARE_ASPECTS,
  SHARE_BACKGROUNDS,
  SHARE_STYLES,
  type ShareAspect,
  type ShareBackground,
  type ShareCardOptions,
  type ShareCardPalettes,
  type ShareStyle,
  shareCardSize,
  shareCardTheme,
} from '../props/share-card'
import { useUi } from '../provider'
import { Button } from './button'
import { Chip } from './chip'
import { ShareCard } from './share-card'
import { Sheet } from './sheet'

export interface ShareStudioProps {
  card: ShareCardText
  options: ShareCardOptions
  palettes: ShareCardPalettes
  onChange: (options: ShareCardOptions) => void
  onCopyText: () => void
  onShareImage: () => void
  /**
   * Saves straight to the photo library. Null where the host cannot: the
   * share button then says it saves too, because the system share sheet
   * offers "Save Image".
   */
  onSaveImage: (() => void) | null
  /** A line under the actions, such as "Copied". */
  notice: string | null
  onClose: () => void
}

/** How tall the preview is on screen; the card itself stays at its full size. */
const PREVIEW_HEIGHT: Record<ShareAspect, number> = { story: 300, square: 230 }

interface ChoiceRowProps<T extends string> {
  label: string
  values: readonly T[]
  selected: T
  name: (value: T) => string
  onSelect: (value: T) => void
  palette: Palette
}

function ChoiceRow<T extends string>({
  label,
  values,
  selected,
  name,
  onSelect,
  palette,
}: ChoiceRowProps<T>): ReactElement {
  const colors = useColors()

  return (
    <View className="gap-2" role="group" aria-label={label}>
      <Text className="font-semibold text-sm" style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <Chip
            key={value}
            label={name(value)}
            selected={value === selected}
            onPress={() => onSelect(value)}
            palette={palette}
          />
        ))}
      </View>
    </View>
  )
}

/**
 * The share studio: a live preview of the card and the choices that shape
 * it (style, background, size), then copy, save and share. The host holds
 * the options and captures its own full-size card; this only draws.
 */
export function ShareStudio({
  card,
  options,
  palettes,
  onChange,
  onCopyText,
  onShareImage,
  onSaveImage,
  notice,
  onClose,
}: ShareStudioProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const { height: windowHeight } = useWindowDimensions()
  const theme = shareCardTheme(options.style, palettes)
  const size = shareCardSize(options.aspect)
  const scale = PREVIEW_HEIGHT[options.aspect] / size.height
  const preview = { width: size.width * scale, height: size.height * scale }

  const styleName = (style: ShareStyle): string => {
    if (style === 'paper-light') return strings.share.styleLight
    if (style === 'paper-dark') return strings.share.styleDark
    return strings.share.styleAccent
  }
  const backgroundName = (background: ShareBackground): string =>
    background === 'solid' ? strings.share.solid : strings.share.transparent
  const aspectName = (aspect: ShareAspect): string =>
    aspect === 'story' ? strings.share.story : strings.share.square

  return (
    <Sheet title={strings.share.title} onClose={onClose}>
      {/* A phone sheet has no room to spare; the preview and choices scroll on a short one. */}
      <ScrollView
        style={{ maxHeight: windowHeight > 0 ? windowHeight * 0.75 : undefined }}
        contentContainerClassName="gap-4">
        <View
          role="img"
          aria-label={strings.share.preview}
          className="items-center justify-center self-center overflow-hidden rounded-2xl"
          style={{
            ...preview,
            borderCurve: 'continuous',
            backgroundColor: options.background === 'transparent' ? theme.backdrop : undefined,
          }}>
          <View
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ ...size, transform: [{ scale }] }}>
            <ShareCard
              card={card}
              theme={theme}
              background={options.background}
              aspect={options.aspect}
            />
          </View>
        </View>

        <ChoiceRow
          label={strings.share.style}
          values={SHARE_STYLES}
          selected={options.style}
          palette={palettes.current}
          name={styleName}
          onSelect={(style) => onChange({ ...options, style })}
        />
        <ChoiceRow
          label={strings.share.background}
          values={SHARE_BACKGROUNDS}
          selected={options.background}
          palette={palettes.current}
          name={backgroundName}
          onSelect={(background) => onChange({ ...options, background })}
        />
        <ChoiceRow
          label={strings.share.size}
          values={SHARE_ASPECTS}
          selected={options.aspect}
          palette={palettes.current}
          name={aspectName}
          onSelect={(aspect) => onChange({ ...options, aspect })}
        />

        <View className="gap-1">
          <Button
            title={onSaveImage ? strings.share.shareImage : strings.share.saveOrShare}
            onPress={onShareImage}
            color={palettes.current.accent}
            onColor={palettes.current.onAccent}
          />
          {onSaveImage ? (
            <Button
              title={strings.share.saveImage}
              onPress={onSaveImage}
              variant="secondary"
              color={palettes.current.accent}
            />
          ) : null}
          <Button
            title={strings.share.copyText}
            onPress={onCopyText}
            variant="secondary"
            color={palettes.current.accent}
          />
          {notice ? (
            <Text
              role="status"
              aria-live="polite"
              className="text-center text-sm"
              style={{ color: colors.secondaryLabel }}>
              {notice}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  )
}
