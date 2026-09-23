import { AccessoryWidgetBackground, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  padding,
  widgetURL,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'
import type { ReactElement, ReactNode } from 'react'

import type { WidgetModel } from '../model'
import sample from '../sample.json'

type Tone = 'label' | 'secondary' | 'accent'
type Size =
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
type Weight = 'regular' | 'medium' | 'semibold' | 'bold'

/** One dua a day: the Arabic large and right to left, its title, and its meaning where there is room. */
function DuaOfTheDayWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
  'widget'
  // Isolated runtime: nothing outside this body exists here, so every helper
  // is declared inside it and all data arrives through props and environment.
  const family = environment.widgetFamily ?? 'systemSmall'
  const ink = environment.colorScheme === 'dark' ? props.ink.dark : props.ink.light
  const lockScreen =
    family === 'accessoryCircular' ||
    family === 'accessoryRectangular' ||
    family === 'accessoryInline'
  // Lock Screen and tinted Home Screen render in one hue: rely on hierarchy, not hex.
  const plain = lockScreen || (environment.widgetRenderingMode ?? 'fullColor') !== 'fullColor'
  const align = props.rtl ? 'trailing' : 'leading'
  const corner = props.rtl ? 'topTrailing' : 'topLeading'
  const home = 'ihsaanly://'

  const paint = (tone: Tone): ViewModifier => {
    if (plain) {
      return foregroundStyle({
        type: 'hierarchical',
        style: tone === 'secondary' ? 'secondary' : 'primary',
      })
    }
    return foregroundStyle(
      tone === 'accent' ? ink.accent : tone === 'secondary' ? ink.secondaryLabel : ink.label,
    )
  }
  const say = (
    value: string,
    size: Size,
    tone: Tone,
    limit: number,
    weight?: Weight,
  ): ReactElement => (
    <Text
      modifiers={[
        font({ textStyle: size, weight }),
        paint(tone),
        lineLimit(limit),
        multilineTextAlignment(align),
        minimumScaleFactor(0.7),
      ]}>
      {value}
    </Text>
  )
  const panel = (children: ReactNode, url: string): ReactElement => (
    <VStack
      alignment={align}
      spacing={4}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: corner }),
        containerBackground(
          plain
            ? ink.background
            : {
                type: 'linearGradient',
                colors: [ink.background, ink.backgroundEnd],
                startPoint: { x: 0, y: 0 },
                endPoint: { x: 1, y: 1 },
              },
          'widget',
        ),
        widgetURL(url),
      ]}>
      {children}
    </VStack>
  )
  const strip = (children: ReactNode, url: string): ReactElement => (
    <VStack
      alignment={align}
      spacing={1}
      modifiers={[
        frame({ maxWidth: Infinity, alignment: align }),
        containerBackground('clear', 'widget'),
        widgetURL(url),
      ]}>
      {children}
    </VStack>
  )
  const circle = (children: ReactNode, url: string): ReactElement => (
    <ZStack modifiers={[containerBackground('clear', 'widget'), widgetURL(url)]}>
      <AccessoryWidgetBackground />
      {children}
    </ZStack>
  )
  const inline = (value: string, url: string): ReactElement => (
    <Text modifiers={[containerBackground('clear', 'widget'), widgetURL(url)]}>{value}</Text>
  )
  const heading = (value: string): ReactElement => say(value, 'caption', 'accent', 1, 'semibold')

  if (props.stale) {
    if (family === 'accessoryInline') return inline(props.labels.openApp, home)
    if (family === 'accessoryCircular') {
      return circle(<Image systemName="arrow.clockwise" size={20} />, home)
    }
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.openApp, 'footnote', 'label', 3), home)
    }
    return panel(say(props.labels.openApp, 'headline', 'label', 4), home)
  }

  const dua = props.duaOfTheDay
  if (!dua) {
    if (family === 'accessoryInline') return inline(props.labels.duaOfTheDay, home)
    if (family === 'accessoryCircular') return circle(<Image systemName="book" size={20} />, home)
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.duaOfTheDay, 'footnote', 'label', 3), home)
    }
    return panel(heading(props.labels.duaOfTheDay), home)
  }

  // Arabic always reads right to left and sits centred, whatever the app's language.
  const arabic = (size: Size, limit: number): ReactElement => (
    <Text
      modifiers={[
        font({ textStyle: size }),
        paint('label'),
        lineLimit(limit),
        multilineTextAlignment('center'),
        minimumScaleFactor(0.5),
        frame({ maxWidth: Infinity, alignment: 'center' }),
      ]}>
      {dua.arabic}
    </Text>
  )

  if (family === 'accessoryInline') return inline(dua.title, dua.url)
  if (family === 'accessoryCircular') {
    return circle(
      <Text
        modifiers={[
          font({ textStyle: 'caption2', weight: 'semibold' }),
          lineLimit(3),
          multilineTextAlignment('center'),
          minimumScaleFactor(0.6),
          padding({ all: 4 }),
        ]}>
        {dua.title}
      </Text>,
      dua.url,
    )
  }
  if (family === 'accessoryRectangular') {
    return strip(
      <>
        {arabic('headline', 2)}
        {say(dua.title, 'caption', 'secondary', 1)}
      </>,
      dua.url,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(props.labels.duaOfTheDay)}
        <Spacer />
        {arabic('title2', 3)}
        <Spacer />
        {say(dua.title, 'caption', 'secondary', 1)}
      </>,
      dua.url,
    )
  }
  if (family === 'systemMedium') {
    return panel(
      <>
        {heading(props.labels.duaOfTheDay)}
        <Spacer />
        {arabic('title', 2)}
        <Spacer />
        {say(dua.title, 'subheadline', 'label', 1, 'medium')}
      </>,
      dua.url,
    )
  }
  return panel(
    <>
      {heading(props.labels.duaOfTheDay)}
      <Spacer />
      {arabic('largeTitle', family === 'systemExtraLarge' ? 5 : 4)}
      <Spacer />
      {say(dua.title, 'headline', 'label', 1)}
      {dua.translation ? say(dua.translation, 'body', 'secondary', 4) : null}
    </>,
    dua.url,
  )
}

export default createWidget<WidgetModel>('DuaOfTheDayWidget', DuaOfTheDayWidget, sample)
