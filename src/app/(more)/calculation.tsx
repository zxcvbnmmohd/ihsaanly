import type { ReactElement } from 'react'
import { setCalculationPreferences, useCalculationPreferences } from '@/prayer/store'
import type { CalculationPreferences } from '@/prayer/calculation'
import { CalculationScreen } from '@/screens/calculation'

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
