import { Text, VStack } from '@expo/ui/swift-ui'
import { containerBackground, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget } from 'expo-widgets'

export interface QuickDuasWidgetProps {
  label: string
  titles: string[]
}

/**
 * The answer to the lift, the hill and the staircase. No sensor can find those
 * moments, so the dua has to be reachable in the two seconds you have.
 */
const QuickDuasWidget = (props: QuickDuasWidgetProps) => {
  'widget'
  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[containerBackground('#000000', 'widget'), padding({ all: 12 })]}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#8E8E93')]}>
        {props.label}
      </Text>
      {props.titles.map((title) => (
        <Text key={title} modifiers={[font({ size: 15 }), foregroundStyle('#FFFFFF')]}>
          {title}
        </Text>
      ))}
    </VStack>
  )
}

export default createWidget('QuickDuasWidget', QuickDuasWidget, {
  label: 'Quick duas',
  titles: [],
})
