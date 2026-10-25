import { useStartingPointScreen } from '@ihsaanly/state/plan/starting-point'
import { useStrings } from '@ihsaanly/state/strings'
import { StartingPointScreen } from '@ihsaanly/ui/screens/starting-point'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'
import { confirmAction } from '~/platform/confirm'

export const Route = createFileRoute('/_more/starting-point')({ component: StartingPointRoute })

function StartingPointRoute(): ReactElement {
  const strings = useStrings()
  const copy = strings.startingPoint

  // Only a set the person made by hand is asked about: nothing brings it back.
  const props = useStartingPointScreen((proceed) => {
    if (confirmAction(`${copy.confirmTitle}\n\n${copy.confirmBody}`)) proceed()
  })

  return (
    <>
      <PageHeader title={copy.title} />
      <StartingPointScreen {...props} />
    </>
  )
}
