import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { ReactElement } from 'react'
import { Fragment } from 'react'
import { Row } from '../components/row'
import { useUi } from '../provider'
import type { FastingTodayEntry, QadaEntry } from '../screens/today'

export interface MakeUpRowsProps {
  qada: QadaEntry[]
  qadaHref: string
  onMakeUp: (prayer: Prayer) => void
  /** Fasts still owed, all sources combined. */
  fastsOwed: number
  /** Null outside Ramadan, and then the row is absent. */
  fastingToday: FastingTodayEntry | null
  onRecordFastOwed: () => void
  onUndoFastOwed: () => void
}

/** What is owed and how to settle it: qada prayers, then fasts. */
export function MakeUpRows({
  qada,
  qadaHref,
  onMakeUp,
  fastsOwed,
  fastingToday,
  onRecordFastOwed,
  onUndoFastOwed,
}: MakeUpRowsProps): ReactElement {
  const { strings } = useUi()
  const firstQada = qada[0]
  // The commonest state is one of each owed; five rows say what one does.
  const qadaUniform = qada.length > 1 && qada.every((entry) => entry.count === firstQada?.count)

  return (
    <Fragment>
      {qada.length === 0 ? null : qadaUniform ? (
        <Row
          href={qadaHref}
          title={strings.qada.summary(qada.reduce((sum, entry) => sum + entry.count, 0))}
          detail={qada.map((entry) => strings.prayer[entry.prayer]).join(', ')}
        />
      ) : (
        <Fragment>
          {qada.map((entry) => (
            <Row
              key={entry.prayer}
              title={strings.prayer[entry.prayer]}
              detail={strings.plan.outstanding(entry.count)}
              onPress={() => onMakeUp(entry.prayer)}
            />
          ))}
          <Row href={qadaHref} title={strings.qada.manage} detail={strings.qada.manageDetail} />
        </Fragment>
      )}
      {fastsOwed > 0 ? <Row href={qadaHref} title={strings.fasting.summary(fastsOwed)} /> : null}
      {/* A quiet row, and only in Ramadan: saying so is the user's act, never an inference. */}
      {fastingToday ? (
        fastingToday.recorded ? (
          <Row
            title={strings.fasting.recordedToday}
            detail={strings.fasting.undo}
            onPress={onUndoFastOwed}
            selected
          />
        ) : (
          <Row
            title={strings.fasting.notFastingToday}
            detail={strings.fasting.notFastingTodayDetail}
            onPress={onRecordFastOwed}
          />
        )
      ) : null}
    </Fragment>
  )
}
