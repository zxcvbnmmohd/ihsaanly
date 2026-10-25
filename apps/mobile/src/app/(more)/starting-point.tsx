import { useStartingPointScreen } from '@ihsaanly/state/plan/starting-point'
import { useStrings } from '@ihsaanly/state/strings'
import { StartingPointScreen } from '@ihsaanly/ui/screens/starting-point'
import type { ReactElement } from 'react'
import { Alert } from 'react-native'

export default function StartingPointRoute(): ReactElement {
  const strings = useStrings()

  // Only a set the person made by hand is asked about: nothing brings it back.
  const props = useStartingPointScreen((proceed) => {
    const copy = strings.startingPoint
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.confirm, style: 'destructive', onPress: proceed },
    ])
  })

  return <StartingPointScreen {...props} />
}
