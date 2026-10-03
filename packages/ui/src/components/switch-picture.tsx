import type { ReactElement } from 'react'
import { type ColorValue, Switch } from 'react-native'

export interface SwitchPictureProps {
  value: boolean
  onValueChange: (value: boolean) => void
  trackOn: ColorValue
  trackOff: ColorValue
  knob: ColorValue
}

/**
 * The switch drawn inside a `SwitchRow`. The row is the one switch; this is
 * its picture, hidden from assistive tech so it is not announced twice. On
 * native it is the platform Switch (a tap on it still toggles); the web draws
 * a plain track and knob instead (`switch-picture.web.tsx`), since an input
 * there would be a second focusable control nested in the row.
 */
export function SwitchPicture({
  value,
  onValueChange,
  trackOn,
  trackOff,
  knob,
}: SwitchPictureProps): ReactElement {
  return (
    <Switch
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      tabIndex={-1}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: trackOn, false: trackOff }}
      thumbColor={knob}
    />
  )
}
