import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import { CalculationScreen } from '@ihsaanly/ui/screens/calculation'
import type { ReactElement } from 'react'
import { setCalculationPreferences, useCalculationPreferences } from '@/prayer/store'

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
