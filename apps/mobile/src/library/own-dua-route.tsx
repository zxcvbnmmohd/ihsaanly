import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, windowAt } from '@ihsaanly/core/prayer/windows'
import { usePlace } from '@ihsaanly/state/location/store'
import { deleteOwnDua, ownDuaById, useOwnDuas } from '@ihsaanly/state/my-duas/store'
import { completeItem, uncompleteItem, useCompletedToday } from '@ihsaanly/state/plan/completions'
import { usePlan } from '@ihsaanly/state/plan/use-plan'
import { useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useNow } from '@ihsaanly/state/time/use-now'
import { OwnDuaScreen } from '@ihsaanly/ui/screens/own-dua'
import * as Haptics from 'expo-haptics'
import { router, Stack } from 'expo-router'
import { type ReactElement, useState } from 'react'
import { Alert } from 'react-native'

interface Thing {
  count: number
}

interface OwnDuaRouteProps {
  id: string
}

/**
 * `/item/mine-…`: one of the user's own duas. Marked done the way an item is
 * (`completeItem`), so one placed on Today by its moment leaves Today too.
 */
export function OwnDuaRoute({ id }: OwnDuaRouteProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ count: 0 })
  const strings = useStrings()
  const dua = ownDuaById(useOwnDuas(), id)
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const now = useNow()
  const planned = usePlan()
  const timeZone = place?.timeZone ?? 'UTC'
  const completedToday = useCompletedToday(timeZone, now)

  // Open in the plan means the completion, if any, belongs to an earlier occasion.
  const open = planned?.today.now.some((entry) => entry.itemId === id) ?? false
  const done = completedToday[id] !== undefined && !open

  const complete = (): void => {
    const window = place
      ? (windowAt(now, buildWindows(prayerTimesAcross(place, now, calculation))) ?? undefined)
      : undefined
    completeItem(id, new Date(), timeZone, window)
  }

  const toggleDone = (): void => {
    if (done) {
      uncompleteItem(id, new Date(), timeZone)
      setThing({ count: 0 })
      return
    }
    complete()
  }

  const tapCounter = (): void => {
    if (!dua) return
    const next = thing.count + 1
    if (next >= dua.repeat) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setThing({ count: dua.repeat })
      complete()
      return
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setThing({ count: next })
  }

  const confirmDelete = (): void => {
    Alert.alert(strings.myDuas.deleteConfirm, strings.myDuas.deleteBody, [
      { text: strings.myDuas.cancel, style: 'cancel' },
      {
        text: strings.myDuas.delete,
        style: 'destructive',
        onPress: () => {
          deleteOwnDua(id)
          router.back()
        },
      },
    ])
  }

  return (
    <>
      <Stack.Screen options={{ title: dua?.title ?? strings.notFound.title }} />
      <OwnDuaScreen
        dua={
          dua
            ? {
                title: dua.title,
                arabic: dua.arabic,
                transliteration: dua.transliteration,
                text: dua.text,
                repeat: dua.repeat,
                moment: dua.moment ? strings.myDuas.moment[dua.moment] : null,
              }
            : null
        }
        done={done}
        onToggleDone={toggleDone}
        counter={dua && dua.repeat > 1 ? { count: thing.count, target: dua.repeat } : null}
        onTapCounter={tapCounter}
        onResetCounter={() => setThing({ count: 0 })}
        editHref={`/my-dua?id=${id}`}
        onDelete={confirmDelete}
      />
    </>
  )
}
