import { MOON_SIGHTING_AUTHORITIES } from '@ihsaanly/core/content/moon-sighting'
import { setHijriOffset, useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useHijriDate } from '@ihsaanly/state/hijri/use-hijri-date'
import { HijriScreen } from '@ihsaanly/ui/screens/hijri'
import type { ReactElement } from 'react'

export default function HijriRoute(): ReactElement {
  const offset = useHijriOffset()
  const preview = useHijriDate()

  return (
    <HijriScreen
      offset={offset}
      preview={preview}
      authorities={MOON_SIGHTING_AUTHORITIES}
      onChange={setHijriOffset}
    />
  )
}
