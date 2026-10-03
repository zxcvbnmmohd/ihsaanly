import type { ReactElement } from 'react'
import { View } from 'react-native'

import type { SwitchPictureProps } from './switch-picture'

/**
 * The web twin of `switch-picture.tsx`: a track and knob made of plain views,
 * with no input, so the row's role=switch is the only control (axe:
 * nested-interactive, aria-hidden-focus). Sized like react-native-web's Switch.
 */
export function SwitchPicture({
  value,
  trackOn,
  trackOff,
  knob,
}: SwitchPictureProps): ReactElement {
  return (
    <View
      aria-hidden
      testID="switch-picture"
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        padding: 2,
        backgroundColor: value ? trackOn : trackOff,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: knob }} />
    </View>
  )
}
