import { useState, type ReactElement } from 'react'

import {
  recordFastsMadeUp,
  setFastBacklog,
  useFastBacklog,
  useFastsOutstanding,
} from '@/fasting/store'
import { usePlace } from '@/location/store'
import { setBacklog, useQadaBacklog } from '@/prayer/backlog-store'
import { markMadeUpMany, useQada } from '@/prayer/marks'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { QadaScreen } from '@/screens/qada'

interface Thing {
  pending: Partial<Record<Prayer, number>>
}

export default function QadaRoute(): ReactElement {
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
  )
}
