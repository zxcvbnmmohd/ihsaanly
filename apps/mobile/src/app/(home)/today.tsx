import { Redirect } from 'expo-router'
import type { ReactElement } from 'react'

// The web app keeps Today at /today (its / only redirects); a shared
// companion.ihsaanly.app/today link, or the Android banner's intent for it,
// arrives here and lands on this app's Today.
export default function TodayAlias(): ReactElement {
  return <Redirect href="/" />
}
