import { markCoachTourSeen, useCoachTourSeen } from '@ihsaanly/state/coach/tours'
import {
  type WidgetsCoach,
  type WidgetsCoachTarget,
  WidgetsScreen,
} from '@ihsaanly/ui/screens/widgets'
import { type ReactElement, useState } from 'react'
import { Platform } from 'react-native'
import { useWidgetPreview } from '@/widgets/use-preview'

/** First use: the size (and, on iOS, Home or Lock Screen) chips, then a live preview. */
const COACH_STEPS: readonly WidgetsCoachTarget[] = ['choose', 'preview']

interface Thing {
  /** The first-use tour: where it is, and whether it was finished or skipped here. */
  coachStep: number
  coachEnded: boolean
}

/**
 * More → Widgets, also opened as `ihsaanly://widgets` (`WIDGET_GALLERY_HREF`
 * in `@ihsaanly/ui/props/more`). The previews are the widgets' current entry.
 */
export default function WidgetsRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ coachStep: 0, coachEnded: false })
  const coachSeen = useCoachTourSeen('widgetGallery')
  const target = COACH_STEPS[thing.coachStep]

  const endCoach = (): void => {
    markCoachTourSeen('widgetGallery')
    setThing((current) => ({ ...current, coachEnded: true }))
  }
  const coach: WidgetsCoach | null =
    !coachSeen && !thing.coachEnded && target
      ? {
          target,
          step: thing.coachStep,
          total: COACH_STEPS.length,
          onNext: () => {
            if (thing.coachStep + 1 >= COACH_STEPS.length) endCoach()
            else setThing((current) => ({ ...current, coachStep: current.coachStep + 1 }))
          },
          onSkip: endCoach,
        }
      : null

  return (
    <WidgetsScreen
      model={useWidgetPreview()}
      platform={Platform.OS === 'android' ? 'android' : 'ios'}
      coach={coach}
    />
  )
}
