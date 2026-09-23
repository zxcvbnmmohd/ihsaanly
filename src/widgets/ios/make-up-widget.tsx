import { AccessoryWidgetBackground, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
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

/** What is owed: prayers and fasts to make up, or that nothing is. */
function MakeUpWidget(props: WidgetModel, environment: WidgetEnvironment): ReactElement {
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

  const owed = props.makeUp
  const url = owed.url
  const total = owed.prayers + owed.fasts
  const summary = total > 0 ? (owed.summary ?? `${total}`) : props.labels.nothingOwed
  const parts = total > 0 && owed.summary ? owed.summary.split(' · ') : [summary]

  if (family === 'accessoryInline') return inline(summary, url)
  if (family === 'accessoryCircular') {
    return circle(
      total > 0 ? (
        say(`${total}`, 'title2', 'label', 1, 'bold')
      ) : (
        <Image systemName="checkmark" size={20} />
      ),
      url,
    )
  }
  if (family === 'accessoryRectangular') {
    return strip(
      <>
        {say(props.labels.makeUp, 'caption', 'secondary', 1, 'semibold')}
        {parts.slice(0, 2).map((part) => (
          <VStack key={part}>{say(part, 'headline', 'label', 1)}</VStack>
        ))}
      </>,
      url,
    )
  }
  if (family === 'systemSmall') {
    return panel(
      <>
        {heading(props.labels.makeUp)}
        {total > 0 ? say(`${total}`, 'largeTitle', 'label', 1, 'bold') : null}
        {say(summary, total > 0 ? 'footnote' : 'headline', total > 0 ? 'secondary' : 'label', 3)}
      </>,
      url,
    )
  }
  return panel(
    <>
      {heading(props.labels.makeUp)}
      <Spacer />
      {parts.map((part) => (
        <VStack key={part}>
          {say(part, family === 'systemMedium' ? 'title3' : 'title2', 'label', 1, 'semibold')}
        </VStack>
      ))}
      <Spacer />
    </>,
    url,
  )
}

export default createWidget<WidgetModel>('MakeUpWidget', MakeUpWidget, sample)
