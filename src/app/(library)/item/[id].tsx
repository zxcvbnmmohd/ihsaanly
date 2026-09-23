import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useRef, useState, type ComponentRef, type ReactElement } from 'react'
import { Share, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

import { ShareCard } from '@/components/share-card'
import { itemById, resolveText } from '@/content'
import type { Item } from '@/content/schema'
import { formatShareText, sourceFor, type ShareCardText } from '@/content/share-text'
import { usePlace } from '@/location/store'
import { useKnownItems } from '@/memorise/store'
import { setNotificationPreferences, useNotificationPreferences } from '@/notifications/store'
import { completeItem, uncompleteItem, useCompletedToday } from '@/plan/completions'
import { toggleEnabled, useEnabledItems } from '@/plan/enabled-store'
import { usePlan } from '@/plan/use-plan'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows, windowAt } from '@/prayer/windows'
import { ItemScreen, type RemindState } from '@/screens/item'
import { useStrings, type Strings } from '@/strings'
import { usePalette } from '@/theme/store'
import { useNow } from '@/time/use-now'

interface Thing {
  count: number
}

/**
 * Only window and calendar items are ever scheduled, so only they get a
 * reminder switch. Offering one for a dua on leaving home would be a lie.
 */
function remindFor(
  item: Item,
  enabled: boolean,
  known: boolean,
  perItem: Partial<Record<string, boolean>>,
  defaults: { windows: boolean; lookAhead: boolean },
  strings: Strings,
): RemindState | null {
  if (!enabled || known) return null
  if (item.trigger.kind === 'window') {
    return { value: perItem[item.id] ?? defaults.windows, detail: strings.item.remindWindow }
  }
  if (item.trigger.kind === 'day') {
    return { value: perItem[item.id] ?? defaults.lookAhead, detail: strings.item.remindLookAhead }
  }
  return null
}

function cardFor(item: Item, strings: Strings): ShareCardText {
  const [first] = item.evidence
  return {
    title: resolveText(item.title) ?? item.id,
    arabic: item.arabic,
    transliteration: resolveText(item.transliteration),
    translation: resolveText(item.translation),
    source: first ? sourceFor(first, strings) : null,
  }
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
