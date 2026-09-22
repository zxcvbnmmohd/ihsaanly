import type { ReactElement } from 'react'
import { MOON_SIGHTING_AUTHORITIES } from '@/content/moon-sighting'
import { useHijriDate } from '@/hijri/use-hijri-date'
import { setHijriOffset, useHijriOffset } from '@/hijri/store'
import { HijriScreen } from '@/screens/hijri'

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
