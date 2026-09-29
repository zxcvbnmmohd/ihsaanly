import { Redirect } from 'expo-router'
import type { ReactElement } from 'react'

// The web app gives each onboarding step a URL; this app runs onboarding as
// its own gate in _layout.tsx, so a link to one of them lands on Today (or on
// that gate, if onboarding is not done yet).
export default function OnboardingAlias(): ReactElement {
  return <Redirect href="/" />
}
