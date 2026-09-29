import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import { setCalculationPreferences, useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { CalculationScreen } from '@ihsaanly/ui/screens/calculation'
import type { ReactElement } from 'react'

export default function CalculationRoute(): ReactElement {
  const preferences = useCalculationPreferences()

  return (
    <CalculationScreen
      preferences={preferences}
      onChange={(change: Partial<CalculationPreferences>) =>
        setCalculationPreferences({ ...preferences, ...change })
      }
    />
  )
}
