import {
  AccessoryWidgetBackground,
  Circle,
  Gauge,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui'
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  opacity,
  strokeBorder,
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

/** The five prayers as marks: done filled, passed and unmarked dimmed and dashed, upcoming outlined. */
function PrayersWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
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

  const prayers = props.prayers
  // Empty means tracking is paused: nothing is asked, so nothing is counted.
  if (prayers.length === 0) {
    if (family === 'accessoryInline') return inline(props.labels.nothingNow, home)
    if (family === 'accessoryCircular') return circle(<Image systemName="pause" size={18} />, home)
    if (family === 'accessoryRectangular') {
      return strip(say(props.labels.nothingNow, 'footnote', 'label', 3), home)
    }
    return panel(
      <>
        {heading(props.labels.prayers)}
        {say(props.labels.nothingNow, 'headline', 'label', 4)}
      </>,
      home,
    )
  }

  const done = prayers.filter((prayer) => prayer.done).length
  const count = `${done}/${prayers.length}`
  const mark = (prayer: WidgetModel['prayers'][number], size: number): ReactElement => {
    if (prayer.done) {
      return (
        <Circle
          key={prayer.name}
          modifiers={[frame({ width: size, height: size }), paint('accent')]}
        />
      )
    }
    const edge = plain
      ? { type: 'hierarchical' as const, style: 'secondary' as const }
      : prayer.passed
        ? ink.secondaryLabel
        : ink.label
    return (
      <Circle
        key={prayer.name}
        modifiers={[
          frame({ width: size, height: size }),
          foregroundStyle('clear'),
          strokeBorder({
            content: edge,
            style: { lineWidth: 1.5, dash: prayer.passed ? [2, 2] : [] },
            shape: 'circle',
          }),
          opacity(prayer.passed ? 0.5 : 1),
        ]}
      />
    )
  }
  const order = props.rtl ? [...prayers].reverse() : prayers
  const dots = (size: number): ReactElement => (
    <HStack spacing={size / 2}>{order.map((prayer) => mark(prayer, size))}</HStack>
  )

  if (family === 'accessoryInline') return inline(`${props.labels.prayers} ${count}`, home)
  if (family === 'accessoryCircular') {
    return circle(
      <Gauge
        value={done}
        min={0}
        max={prayers.length}
        modifiers={[gaugeStyle('circularCapacity')]}
        currentValueLabel={<Text>{count}</Text>}>
        <Text>{props.labels.prayers}</Text>
      </Gauge>,
      home,
    )
  }
  if (family === 'accessoryRectangular') {
    return strip(
      <>
        {say(`${props.labels.prayers} ${count}`, 'headline', 'label', 1)}
        {dots(12)}
      </>,
      home,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(props.labels.prayers)}
        {say(count, 'largeTitle', 'label', 1, 'bold')}
        <Spacer />
        {dots(14)}
      </>,
      home,
    )
  }
  if (family === 'systemMedium') {
    return panel(
      <>
        {heading(`${props.labels.prayers} · ${count}`)}
        <Spacer />
        <HStack spacing={12}>
          {order.map((prayer) => (
            <VStack key={prayer.name} spacing={6}>
              {mark(prayer, 28)}
              {say(
                prayer.name,
                'caption',
                prayer.passed && !prayer.done ? 'secondary' : 'label',
                1,
              )}
            </VStack>
          ))}
        </HStack>
        <Spacer />
      </>,
      home,
    )
  }

  return panel(
    <>
      {heading(props.labels.prayers)}
      {say(count, 'largeTitle', 'label', 1, 'bold')}
      {prayers.map((prayer) => (
        <HStack key={prayer.name} spacing={12}>
          {props.rtl
            ? say(prayer.name, 'title3', prayer.passed && !prayer.done ? 'secondary' : 'label', 1)
            : mark(prayer, 24)}
          {props.rtl
            ? mark(prayer, 24)
            : say(prayer.name, 'title3', prayer.passed && !prayer.done ? 'secondary' : 'label', 1)}
        </HStack>
      ))}
    </>,
    home,
  )
}

export default createWidget<WidgetModel>('PrayersWidget', PrayersWidget, sample)
