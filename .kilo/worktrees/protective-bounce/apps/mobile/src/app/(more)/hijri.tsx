import { MOON_SIGHTING_AUTHORITIES } from '@ihsaanly/core/content/moon-sighting'
import { HijriScreen } from '@ihsaanly/ui/screens/hijri'
import type { ReactElement } from 'react'
import { setHijriOffset, useHijriOffset } from '@/hijri/store'
import { useHijriDate } from '@/hijri/use-hijri-date'

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
