import { Spacer, Text, VStack } from '@expo/ui/swift-ui'
import { containerBackground, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget } from 'expo-widgets'

export interface RightNowWidgetProps {
  label: string
  title: string
}

const RightNowWidget = (props: RightNowWidgetProps) => {
  'widget'
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[containerBackground('#000000', 'widget'), padding({ all: 12 })]}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#8E8E93')]}>
        {props.label}
      </Text>
      <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
        {props.title}
      </Text>
      <Spacer />
    </VStack>
  )
}

export default createWidget('RightNowWidget', RightNowWidget, {
  label: 'Right now',
  title: 'Open Ihsaanly',
})
