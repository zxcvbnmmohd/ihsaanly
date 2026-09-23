import { AccessoryWidgetBackground, Image, Link, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  widgetURL,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'
import type { ReactElement, ReactNode } from 'react'

import type { WidgetLink, WidgetModel } from '../model'
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

/** What is coming later this week, each with how far off it is. */
function ComingUpWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
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
  // Medium and larger can hold a tap target per row; small is one target.
  const row = (item: WidgetLink, tappable: boolean): ReactElement => {
    const content = (
      <VStack
        alignment={align}
        spacing={0}
        modifiers={[frame({ maxWidth: Infinity, alignment: align })]}>
        {say(item.title, 'subheadline', 'label', 1, 'medium')}
        {item.detail ? say(item.detail, 'caption', 'secondary', 1) : null}
      </VStack>
    )
    return tappable ? (
      <Link key={item.url} destination={item.url}>
        {content}
      </Link>
    ) : (
      <VStack key={item.url}>{content}</VStack>
    )
  }

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

  const items = props.comingUp
  const first = items[0] ?? null
  const url = first?.url ?? home
  const label = (entry: WidgetLink): string =>
    entry.detail ? `${entry.title} · ${entry.detail}` : entry.title
  if (!first) {
    if (family === 'accessoryInline') return inline(props.labels.nothingNow, home)
    if (family === 'accessoryCircular')
      return circle(<Image systemName="calendar" size={20} />, home)
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.nothingNow, 'footnote', 'label', 3), home)
    }
    return panel(
      <>
        {heading(props.labels.comingUp)}
        {say(props.labels.nothingNow, 'headline', 'label', 4)}
      </>,
      home,
    )
  }

  if (family === 'accessoryInline') return inline(label(first), url)
  if (family === 'accessoryCircular') {
    return circle(
      <VStack spacing={0}>
        <Image systemName="calendar" size={11} />
        {say(`${items.length}`, 'title3', 'label', 1, 'bold')}
      </VStack>,
      url,
    )
  }
  if (family === 'accessoryRectangular') {
    return strip(
      <>
        {say(props.labels.comingUp, 'caption', 'secondary', 1, 'semibold')}
        {items.slice(0, 2).map((entry) => (
          <VStack key={entry.url}>{say(label(entry), 'footnote', 'label', 1)}</VStack>
        ))}
      </>,
      url,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(props.labels.comingUp)}
        {say(first.title, 'headline', 'label', 3)}
        {first.detail ? say(first.detail, 'caption', 'secondary', 1) : null}
      </>,
      url,
    )
  }
  const limit = family === 'systemMedium' ? 2 : family === 'systemExtraLarge' ? 8 : 5
  return panel(
    <>
      {heading(props.labels.comingUp)}
      {items.slice(0, limit).map((entry) => row(entry, true))}
    </>,
    url,
  )
}

export default createWidget<WidgetModel>('ComingUpWidget', ComingUpWidget, sample)
