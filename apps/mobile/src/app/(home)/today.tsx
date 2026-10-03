import { Redirect, useLocalSearchParams } from 'expo-router'
import type { ReactElement } from 'react'

// The web app keeps Today at /today (its / only redirects); a shared
// companion.ihsaanly.app/today link, or the Android banner's intent for it,
// arrives here and lands on this app's Today. More -> Show me around links
// to /today?tour=1, so the tour flag is carried across.
export default function TodayAlias(): ReactElement {
  const { tour } = useLocalSearchParams<{ tour?: string }>()
  return <Redirect href={tour ? { pathname: '/', params: { tour } } : '/'} />
}
