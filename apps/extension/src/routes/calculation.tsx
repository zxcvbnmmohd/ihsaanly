import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import { setCalculationPreferences, useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { useStrings } from '@ihsaanly/state/strings'
import { CalculationScreen } from '@ihsaanly/ui/screens/calculation'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/calculation')({ component: CalculationRoute })

function CalculationRoute(): ReactElement {
  const strings = useStrings()
  const preferences = useCalculationPreferences()

  return (
    <>
      <PageHeader title={strings.calculation.title} />
      <CalculationScreen
        preferences={preferences}
        onChange={(change: Partial<CalculationPreferences>) =>
          setCalculationPreferences({ ...preferences, ...change })
        }
      />
    </>
  )
}
