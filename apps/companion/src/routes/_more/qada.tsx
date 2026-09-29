import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import {
  recordFastsMadeUp,
  setFastBacklog,
  useFastBacklog,
  useFastsOutstanding,
} from '@ihsaanly/state/fasting/store'
import { usePlace } from '@ihsaanly/state/location/store'
import { setBacklog, useQadaBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { markMadeUpMany, useQada } from '@ihsaanly/state/prayer/marks'
import { useStrings } from '@ihsaanly/state/strings'
import { QadaScreen } from '@ihsaanly/ui/screens/qada'
import { createFileRoute } from '@tanstack/react-router'
import { type ReactElement, useState } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/qada')({ component: QadaRoute })

interface Thing {
  pending: Partial<Record<Prayer, number>>
}

function QadaRoute(): ReactElement {
  const strings = useStrings()
  const [thing, setThing] = useState<Thing>({ pending: {} })
  const place = usePlace()
  const outstanding = useQada()
  const backlog = useQadaBacklog()
  const fastsOutstanding = useFastsOutstanding()
  const fastBacklog = useFastBacklog()

  const record = (prayer: Prayer): void => {
    const count = thing.pending[prayer] ?? 0
    if (count <= 0) return
    markMadeUpMany(prayer, count, new Date(), place?.timeZone ?? 'UTC')
    setThing((current) => ({ pending: { ...current.pending, [prayer]: 0 } }))
  }

  return (
    <>
      <PageHeader title={strings.qada.title} />
      <QadaScreen
        rows={PRAYERS.map((prayer) => ({
          prayer,
          outstanding: outstanding[prayer] ?? 0,
          owed: backlog[prayer] ?? 0,
          pending: thing.pending[prayer] ?? 0,
        }))}
        onOwedChange={setBacklog}
        onPendingChange={(prayer, value) =>
          setThing((current) => ({ pending: { ...current.pending, [prayer]: value } }))
        }
        onRecord={record}
        fasts={{ outstanding: fastsOutstanding, owed: fastBacklog }}
        onFastsOwedChange={setFastBacklog}
        onRecordFastMadeUp={() => {
          if (fastsOutstanding > 0) recordFastsMadeUp(1, new Date(), place?.timeZone ?? 'UTC')
        }}
      />
    </>
  )
}
