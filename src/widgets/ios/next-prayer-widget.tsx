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

/** The next prayer and roughly how far off it is. A rough distance, never a clock time. */
function NextPrayerWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
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

  const next = props.next
  if (!next) {
    if (family === 'accessoryInline') return inline(props.labels.nothingNow, home)
    if (family === 'accessoryCircular')
      return circle(<Image systemName="moon.stars" size={20} />, home)
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.nothingNow, 'footnote', 'label', 3), home)
    }
    return panel(
      <>
        {heading(props.labels.upNext)}
        {say(props.labels.nothingNow, 'headline', 'label', 4)}
      </>,
      home,
    )
  }

  if (family === 'accessoryInline') return inline(`${next.prayer} · ${next.distance}`, home)
  if (family === 'accessoryCircular') {
    return circle(
      <VStack spacing={0}>
        <Image systemName="clock" size={12} />
        {say(next.prayer, 'caption', 'label', 1, 'semibold')}
      </VStack>,
      home,
    )
  }
  if (family === 'accessoryRectangular') {
    const first = next.before[0] ?? next.after[0]
    return strip(
      <>
        {say(next.prayer, 'headline', 'label', 1)}
        {say(next.distance, 'caption', 'secondary', 1)}
        {first ? say(first.title, 'caption', 'secondary', 1) : null}
      </>,
      home,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(props.labels.upNext)}
        {say(next.prayer, 'title', 'label', 1, 'bold')}
        {say(next.distance, 'subheadline', 'secondary', 2)}
      </>,
      home,
    )
  }
  if (family === 'systemMedium') {
    const before = next.before[0]
    const after = next.after[0]
    return panel(
      <>
        {heading(props.labels.upNext)}
        {say(`${next.prayer} · ${next.distance}`, 'headline', 'label', 1)}
        {before ? say(`${props.labels.before}: ${before.title}`, 'subheadline', 'label', 1) : null}
        {after ? say(`${props.labels.after}: ${after.title}`, 'subheadline', 'label', 1) : null}
      </>,
      home,
    )
  }

  const limit = family === 'systemExtraLarge' ? 6 : 4
  return panel(
    <>
      {heading(props.labels.upNext)}
      {say(next.prayer, 'largeTitle', 'label', 1, 'bold')}
      {say(next.distance, 'title3', 'secondary', 1)}
      {next.before.length > 0 ? heading(props.labels.before) : null}
      {next.before.slice(0, limit).map((entry) => row(entry, true))}
      {next.after.length > 0 ? heading(props.labels.after) : null}
      {next.after.slice(0, limit).map((entry) => row(entry, true))}
    </>,
    home,
  )
}

export default createWidget<WidgetModel>('NextPrayerWidget', NextPrayerWidget, sample)
