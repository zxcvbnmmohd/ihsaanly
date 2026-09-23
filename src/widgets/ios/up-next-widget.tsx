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

/** What the next prayer asks of you before it and after it. */
function UpNextWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
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
  const asked = next ? [...next.before, ...next.after] : []
  if (!next || asked.length === 0) {
    if (family === 'accessoryInline') return inline(props.labels.nothingNow, home)
    if (family === 'accessoryCircular')
      return circle(<Image systemName="checkmark" size={20} />, home)
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.nothingNow, 'footnote', 'label', 3), home)
    }
    return panel(
      <>
        {heading(next ? `${props.labels.upNext} · ${next.prayer}` : props.labels.upNext)}
        {say(props.labels.nothingNow, 'headline', 'label', 4)}
      </>,
      home,
    )
  }

  const first = asked[0] ?? null
  const url = first?.url ?? home
  if (family === 'accessoryInline') {
    return inline(first ? `${next.prayer}: ${first.title}` : next.prayer, url)
  }
  if (family === 'accessoryCircular') {
    return circle(
      <VStack spacing={0}>
        {say(`${asked.length}`, 'title3', 'label', 1, 'bold')}
        {say(next.prayer, 'caption2', 'secondary', 1)}
      </VStack>,
      url,
    )
  }
  if (family === 'accessoryRectangular') {
    const before = next.before[0]
    const after = next.after[0]
    return strip(
      <>
        {say(next.prayer, 'headline', 'label', 1)}
        {before ? say(`${props.labels.before}: ${before.title}`, 'caption', 'secondary', 1) : null}
        {after ? say(`${props.labels.after}: ${after.title}`, 'caption', 'secondary', 1) : null}
      </>,
      url,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(`${props.labels.upNext} · ${next.prayer}`)}
        {first ? say(first.title, 'headline', 'label', 3) : null}
        {asked.length > 1 ? say(`+${asked.length - 1}`, 'caption', 'secondary', 1) : null}
      </>,
      url,
    )
  }

  const limit = family === 'systemMedium' ? 1 : family === 'systemExtraLarge' ? 6 : 4
  return panel(
    <>
      {heading(`${props.labels.upNext} · ${next.prayer}`)}
      {family === 'systemMedium' ? null : say(next.distance, 'subheadline', 'secondary', 1)}
      {next.before.length > 0
        ? say(props.labels.before, 'caption', 'secondary', 1, 'semibold')
        : null}
      {next.before.slice(0, limit).map((entry) => row(entry, true))}
      {next.after.length > 0
        ? say(props.labels.after, 'caption', 'secondary', 1, 'semibold')
        : null}
      {next.after.slice(0, family === 'systemMedium' ? 2 : limit).map((entry) => row(entry, true))}
    </>,
    url,
  )
}

export default createWidget<WidgetModel>('UpNextWidget', UpNextWidget, sample)
