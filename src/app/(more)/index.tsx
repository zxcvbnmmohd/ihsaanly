import type { ReactElement } from 'react'
import { useHijriOffset } from '@/hijri/store'
import { usePlace } from '@/location/store'
import { useCalculationPreferences } from '@/prayer/store'
import { MoreScreen } from '@/screens/more'
import { strings } from '@/strings'

export default function MoreRoute(): ReactElement {
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const hijriOffset = useHijriOffset()

  return (
    <MoreScreen
      locationHref="/location"
      locationLabel={place?.label ?? strings.location.notSet}
      calculationHref="/calculation"
      calculationLabel={strings.asr[calculation.asr]}
      hijriHref="/hijri"
      hijriLabel={strings.hijri.offsetLabel(hijriOffset)}
      diagnosticsHref="/diagnostics"
    />
  )
}
