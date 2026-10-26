import { type Palette, scene } from '@ihsaanly/tailwind/tokens'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, Text, type TextStyle, View } from 'react-native'

import { arabic } from '../fonts'
import { useUi } from '../provider'

const APP_ICON = require('../../assets/images/app-icon.png')

/** The name the system prints under a widget and in its widget sheet. A brand, never translated. */
export const APP_NAME = 'Ihsaanly'

export type PreviewPlatform = 'ios' | 'android'
export type HomeFamily = 'small' | 'medium' | 'large'
export type LockFamily = 'circular' | 'rectangular' | 'inline'

/**
 * Every colour a widget paints with: the app's `WidgetInk`, structurally. One
 * object, so whatever decides the app's colours (an accent today, a full theme
 * tomorrow) only has to produce it.
 */
export interface PreviewInk {
  background: string
  backgroundEnd: string
  accent: string
  onAccent: string
  label: string
  secondaryLabel: string
}

/** The palette a screen already has, as a widget's ink: the same mapping as the app's `inkFor`. */
export function previewInkFor(palette: Palette): PreviewInk {
  return {
    background: palette.wash[0],
    backgroundEnd: palette.wash[1],
    accent: palette.accent,
    onAccent: palette.onAccent,
    label: palette.ink,
    secondaryLabel: palette.inkSecondary,
  }
}

/** The Lock Screen tints every widget one vibrant white, whatever the app's colours. */
export const LOCK_INK: PreviewInk = {
  background: scene.accessory,
  backgroundEnd: scene.accessory,
  accent: scene.onWallpaper,
  onAccent: scene.onWallpaper,
  label: scene.onWallpaper,
  secondaryLabel: scene.onWallpaperSecondary,
}

/**
 * Widget sizes in points on an iPhone 17 Pro. Android launchers size by cells,
 * which come out close to these on a phone (a 2×2, a 4×2 and a 4×4).
 */
export const WIDGET_POINTS: Record<HomeFamily | Exclude<LockFamily, 'inline'>, Size> = {
  small: { width: 170, height: 170 },
  medium: { width: 364, height: 170 },
  large: { width: 364, height: 382 },
  circular: { width: 76, height: 76 },
  rectangular: { width: 172, height: 76 },
}

interface Size {
  width: number
  height: number
}

/** iOS: the widget's continuous corner and SwiftUI's default content margin. Android: the app's own `Frame`. */
const FRAME: Record<PreviewPlatform, { radius: number; padding: number }> = {
  ios: { radius: 24, padding: 16 },
  android: { radius: 22, padding: 14 },
}

/** How a widget is being drawn: its ink, the platform's type, the Lock Screen's one hue, and the scale. */
export interface WidgetLook {
  ink: PreviewInk
  platform: PreviewPlatform
  lock: boolean
  /** Points on screen per point on the phone: below 1 when the preview has less room than a phone. */
  scale: number
  /** An inline Lock Screen widget: iOS sets whatever it says in the date line's own type. */
  dateLine?: boolean
}

export type WidgetTone = 'label' | 'secondary' | 'accent'
export type WidgetTextSize =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'subheadline'
  | 'body'
  | 'footnote'
  | 'caption'
  | 'caption2'
export type WidgetWeight = 'regular' | 'medium' | 'semibold' | 'bold'

interface Type {
  size: number
  weight: WidgetWeight
}

/**
 * SwiftUI's text styles at the default Dynamic Type size, which is what the
 * iOS widgets ask for, and the sp the Android widgets set by hand (`parts.tsx`:
 * captions 12 bold, headlines 17 bold, rows 13, details 11).
 */
const TYPE: Record<PreviewPlatform, Record<WidgetTextSize, Type>> = {
  ios: {
    largeTitle: { size: 34, weight: 'bold' },
    title: { size: 28, weight: 'bold' },
    title2: { size: 22, weight: 'bold' },
    title3: { size: 20, weight: 'bold' },
    headline: { size: 17, weight: 'semibold' },
    subheadline: { size: 15, weight: 'regular' },
    body: { size: 17, weight: 'regular' },
    footnote: { size: 13, weight: 'regular' },
    caption: { size: 12, weight: 'regular' },
    caption2: { size: 11, weight: 'regular' },
  },
  android: {
    largeTitle: { size: 30, weight: 'bold' },
    title: { size: 26, weight: 'bold' },
    title2: { size: 22, weight: 'bold' },
    title3: { size: 18, weight: 'bold' },
    headline: { size: 17, weight: 'bold' },
    subheadline: { size: 13, weight: 'regular' },
    body: { size: 15, weight: 'regular' },
    footnote: { size: 13, weight: 'regular' },
    caption: { size: 12, weight: 'regular' },
    caption2: { size: 11, weight: 'regular' },
  },
}

/** The Lock Screen's date line, and every inline widget on it. */
const DATE_LINE: Type = { size: 17, weight: 'semibold' }

const WEIGHT: Record<WidgetWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}

export function toneColor(look: WidgetLook, tone: WidgetTone): string {
  if (tone === 'accent') return look.ink.accent
  return tone === 'secondary' ? look.ink.secondaryLabel : look.ink.label
}

export interface WidgetTextProps {
  look: WidgetLook
  text: string
  size: WidgetTextSize
  tone?: WidgetTone
  lines?: number
  /** Overrides the style's own weight, as `font({ weight })` does in the iOS widgets. */
  weight?: WidgetWeight
  /** The dua of the day's Arabic: centred, right to left, in the Arabic face. */
  arabic?: boolean
}

/** One line of a widget's text at the platform's size, shrinking to 70% before it truncates, as iOS does. */
export function WidgetText({
  look,
  text,
  size,
  tone = 'label',
  lines = 1,
  weight,
  arabic: isArabic = false,
}: WidgetTextProps): ReactElement {
  const type = look.dateLine ? DATE_LINE : TYPE[look.platform][size]
  // Android reads bold where iOS asks semibold: its widgets have only the two weights.
  const chosen = look.dateLine ? type.weight : (weight ?? type.weight)
  const fontWeight =
    look.platform === 'android' && chosen === 'semibold' ? WEIGHT.bold : WEIGHT[chosen]
  return (
    <Text
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      className={isArabic ? 'text-center' : 'text-start'}
      style={{
        color: toneColor(look, tone),
        fontSize: type.size * look.scale,
        fontWeight,
        ...(isArabic
          ? {
              fontFamily: arabic,
              writingDirection: 'rtl',
              lineHeight: type.size * look.scale * 1.5,
            }
          : {}),
      }}>
      {text}
    </Text>
  )
}

export interface WidgetFrameProps {
  look: WidgetLook
  family: HomeFamily
  children: ReactNode
}

/**
 * A Home Screen widget's own shape: its size on the phone, the continuous
 * corner iOS gives it (Android's launcher rounds plainer), its margin and the
 * ink's gradient, top leading to bottom trailing, as the widgets paint it.
 */
export function WidgetFrame({ look, family, children }: WidgetFrameProps): ReactElement {
  const size = WIDGET_POINTS[family]
  const frame = FRAME[look.platform]
  return (
    <LinearGradient
      testID="widget-frame"
      colors={[look.ink.background, look.ink.backgroundEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size.width * look.scale,
        height: size.height * look.scale,
        borderRadius: frame.radius * look.scale,
        borderCurve: 'continuous',
        overflow: 'hidden',
        padding: frame.padding * look.scale,
        gap: 4 * look.scale,
        // iOS lifts a widget off the wallpaper with a soft shadow; Android draws it flat.
        boxShadow:
          look.platform === 'ios'
            ? `0px ${2 * look.scale}px ${10 * look.scale}px ${scene.textShadow}`
            : undefined,
      }}>
      {children}
    </LinearGradient>
  )
}

export interface LockFrameProps {
  look: WidgetLook
  family: LockFamily
  children: ReactNode
}

/**
 * A Lock Screen widget: the round one on its translucent disc
 * (AccessoryWidgetBackground), the wide one bare, the inline one a single line.
 */
export function LockFrame({ look, family, children }: LockFrameProps): ReactElement {
  if (family === 'inline') {
    return <View className="flex-row items-center">{children}</View>
  }
  const size = WIDGET_POINTS[family]
  const round = family === 'circular'
  return (
    <View
      testID="lock-widget"
      className={round ? 'items-center justify-center' : 'justify-center'}
      style={{
        width: size.width * look.scale,
        height: size.height * look.scale,
        borderRadius: round ? (size.width * look.scale) / 2 : 0,
        backgroundColor: round ? scene.accessory : undefined,
        overflow: 'hidden',
        gap: 1 * look.scale,
      }}>
      {children}
    </View>
  )
}

export interface AppIconProps {
  /** Points; the corner follows iOS's icon mask at any size. */
  size: number
}

/** The real app icon, from the same generator as the one on the Home Screen. */
export function AppIcon({ size }: AppIconProps): ReactElement {
  return (
    <Image
      testID="app-icon"
      source={APP_ICON}
      accessibilityIgnoresInvertColors
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2237,
        borderCurve: 'continuous',
        overflow: 'hidden',
        boxShadow: `0px 1px 3px ${scene.textShadow}`,
      }}
      contentFit="cover"
    />
  )
}

export type WidgetPlacement = 'home' | 'lock'

export interface WidgetSceneProps {
  placement: WidgetPlacement
  platform: PreviewPlatform
  /** The wallpaper is the ink's accent, lit and shaded. */
  ink: PreviewInk
  /** Points the widest widget in the scene needs; the scene scales everything to fit it. */
  fit: number
  /** Under a Home Screen widget on iOS: the app's name, as the system labels it. */
  appName?: string | null
  /** The Lock Screen's date line, above the clock. */
  date?: string | null
  /** An inline Lock Screen widget: drawn on the date line, as iOS places it. */
  inline?: (scale: number) => ReactNode
  /** What a screen reader hears for the whole scene. */
  label?: string
  children?: (scale: number) => ReactNode
}

interface Thing {
  width: number
}

/** The clock iOS shows in every screenshot Apple publishes; a picture, not the time. */
const CLOCK = '9:41'
const INSET = 20

/**
 * A wallpaper with widgets on it, as they will be seen: a Home Screen, the app's
 * name under each widget on iOS, or a Lock Screen with its date and clock above
 * the widgets. It measures itself and hands its children the scale that fits
 * `fit` points across, never more than the phone's own size.
 */
export function WidgetScene({
  placement,
  platform,
  ink,
  fit,
  appName = null,
  date = null,
  inline,
  label,
  children,
}: WidgetSceneProps): ReactElement {
  const { scheme } = useUi()
  const [thing, setThing] = useState<Thing>({ width: 0 })
  const scale = thing.width > 0 ? Math.min(1, (thing.width - INSET * 2) / fit) : 1
  const lock = placement === 'lock'
  const onWallpaper = {
    color: scene.onWallpaper,
    textShadowColor: scene.textShadow,
    textShadowRadius: 4,
  }
  const measure = (event: LayoutChangeEvent): void => {
    const width = Math.round(event.nativeEvent.layout.width)
    setThing((current) => (current.width === width ? current : { width }))
  }

  return (
    <View
      role={label ? 'img' : undefined}
      aria-label={label}
      onLayout={measure}
      className="grow overflow-hidden"
      style={{ backgroundColor: ink.accent }}>
      <LinearGradient
        colors={[scene.glow, lock ? scene.lockShade : scene.shade[scheme]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="grow items-center justify-center" style={{ padding: INSET, gap: 6 * scale }}>
        {lock ? (
          <View className="items-center">
            {date || inline ? (
              <View className="flex-row items-center" style={{ gap: 6 * scale, maxWidth: '100%' }}>
                {date ? (
                  <Text
                    style={[
                      onWallpaper,
                      { fontSize: DATE_LINE.size * scale, fontWeight: WEIGHT[DATE_LINE.weight] },
                    ]}>
                    {date}
                  </Text>
                ) : null}
                {inline ? <View className="shrink">{inline(scale)}</View> : null}
              </View>
            ) : null}
            <Text
              style={[
                onWallpaper,
                {
                  fontSize: 84 * scale,
                  lineHeight: 92 * scale,
                  fontWeight: '700',
                  letterSpacing: -2 * scale,
                },
              ]}>
              {CLOCK}
            </Text>
          </View>
        ) : null}
        {children ? children(scale) : null}
        {!lock && platform === 'ios' && appName ? (
          <Text
            numberOfLines={1}
            style={[onWallpaper, { fontSize: 12 * scale, fontWeight: '500' }]}>
            {appName}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
