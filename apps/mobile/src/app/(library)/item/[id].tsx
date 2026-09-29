import { itemById, resolveText } from '@ihsaanly/core/content'
import { formatShareText, sourceFor } from '@ihsaanly/core/content/share-text'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, windowAt } from '@ihsaanly/core/prayer/windows'
import { usePlace } from '@ihsaanly/state/location/store'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import {
  setNotificationPreferences,
  useNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { completeItem, uncompleteItem, useCompletedToday } from '@ihsaanly/state/plan/completions'
import { toggleEnabled, useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { usePlan } from '@ihsaanly/state/plan/use-plan'
import { useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useNow } from '@ihsaanly/state/time/use-now'
import { ShareCard } from '@ihsaanly/ui/components/share-card'
import { cardFor, remindFor } from '@ihsaanly/ui/props/item'
import { ItemScreen } from '@ihsaanly/ui/screens/item'
import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { type ComponentRef, type ReactElement, useRef, useState } from 'react'
import { Share, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { usePalette } from '@/theme/store'

interface Thing {
  count: number
}

export default function ItemRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ count: 0 })
  const cardRef = useRef<ComponentRef<typeof View>>(null)
  const strings = useStrings()
  const palette = usePalette()
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemById(id)
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const now = useNow()
  const planned = usePlan()
  const completedToday = useCompletedToday(place?.timeZone ?? 'UTC', now)
  const enabled = useEnabledItems()
  const known = useKnownItems()
  const notifications = useNotificationPreferences()

  const title = item ? resolveText(item.title) : null
  const timeZone = place?.timeZone ?? 'UTC'
  const isEnabled = item ? enabled.includes(item.id) : false
  // Open in the plan means the completion, if any, belongs to an earlier occasion.
  const open = item
    ? (planned?.today.now.some((entry) => entry.itemId === item.id) ?? false)
    : false
  const done = item ? completedToday[item.id] !== undefined && !open : false

  const currentWindow = (): { startsAt: Date; endsAt: Date } | undefined => {
    if (!place) return undefined
    return windowAt(now, buildWindows(prayerTimesAcross(place, now, calculation))) ?? undefined
  }

  const complete = (): void => {
    if (!item) return
    completeItem(item.id, new Date(), timeZone, currentWindow())
  }

  const toggleDone = (): void => {
    if (!item) return
    if (done) {
      uncompleteItem(item.id, new Date(), timeZone)
      setThing({ count: 0 })
      return
    }
    complete()
  }

  const tapCounter = (): void => {
    if (!item) return
    const next = thing.count + 1
    if (next >= item.repeat) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setThing({ count: item.repeat })
      complete()
      return
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setThing({ count: next })
  }

  const toggleRemind = (value: boolean): void => {
    if (!item) return
    setNotificationPreferences({
      ...notifications,
      perItem: { ...notifications.perItem, [item.id]: value },
    })
  }

  const shareText = (): void => {
    if (!item) return
    void Share.share({ message: formatShareText(cardFor(item, strings), strings) })
  }

  const shareImage = async (): Promise<void> => {
    if (!item) return
    try {
      const uri = await captureRef(cardRef, { format: 'png', result: 'tmpfile', width: 1080 })
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable')
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' })
    } catch {
      shareText()
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: title ?? strings.notFound.title }} />
      <ItemScreen
        title={title ?? strings.notFound.title}
        memoriseHref={item && item.arabic ? `/item/memorise/${item.id}` : null}
        item={
          item
            ? {
                ruling: item.ruling,
                rulingHref: `/glossary?term=${item.ruling}`,
                reviewed: item.reviewed,
                why: resolveText(item.why),
                how: item.how.flatMap((step) => resolveText(step) ?? []),
                repeat: item.repeat,
                arabic: item.arabic,
                transliteration: resolveText(item.transliteration),
                translation: resolveText(item.translation),
                note: resolveText(item.note),
                evidence: item.evidence,
                parts: (item.parts ?? []).map((part) => ({
                  id: part.id,
                  title: resolveText(part.title) ?? part.id,
                  arabic: part.arabic,
                  transliteration: resolveText(part.transliteration),
                  translation: resolveText(part.translation),
                  repeat: part.repeat,
                  source: part.evidence.map((evidence) => sourceFor(evidence, strings)).join(' · '),
                })),
              }
            : null
        }
        done={done}
        onToggleDone={toggleDone}
        counter={item && item.repeat > 1 ? { count: thing.count, target: item.repeat } : null}
        onTapCounter={tapCounter}
        onResetCounter={() => setThing({ count: 0 })}
        onToday={isEnabled}
        onToggleOnToday={() => {
          if (item) toggleEnabled(item.id)
        }}
        remind={
          item
            ? remindFor(
                item,
                isEnabled,
                known.includes(item.id),
                notifications.perItem,
                notifications,
                strings,
              )
            : null
        }
        onToggleRemind={toggleRemind}
        onShareText={shareText}
        onShareImage={() => void shareImage()}
      />
      {item ? (
        <View
          ref={cardRef}
          collapsable={false}
          pointerEvents="none"
          style={{ position: 'absolute', top: -10000, start: 0 }}>
          <ShareCard card={cardFor(item, strings)} palette={palette} />
        </View>
      ) : null}
    </>
  )
}
