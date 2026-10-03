import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime, spyOn } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import {
  getNotificationPreferences,
  setNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { act } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { Share } from 'react-native'
import { renderScreen } from '../../../../../../packages/ui/test/render'
import { actAsync } from '../../../../test/library'
import { router } from '../../../../test/router'

type ItemProps = ComponentProps<typeof import('@ihsaanly/ui/screens/item').ItemScreen>

const itemProps: ItemProps[] = []
mock.module('@ihsaanly/ui/screens/item', () => ({
  ItemScreen: (props: ItemProps): ReactElement => {
    itemProps.push(props)
    return <div data-testid="item-screen" />
  },
}))

const haptics: string[] = []
mock.module('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
  notificationAsync: async (type: string) => void haptics.push(`notification:${type}`),
  impactAsync: async (style: string) => void haptics.push(`impact:${style}`),
}))

const sharing = {
  available: true,
  shared: [] as { uri: string; options: unknown }[],
}
mock.module('expo-sharing', () => ({
  isAvailableAsync: async () => sharing.available,
  shareAsync: async (uri: string, options: unknown) => void sharing.shared.push({ uri, options }),
}))

const capture = { fail: false, calls: [] as unknown[] }
mock.module('react-native-view-shot', () => ({
  captureRef: async (_ref: unknown, options: unknown) => {
    capture.calls.push(options)
    if (capture.fail) throw new Error('capture failed')
    return 'file:///tmp/card.png'
  },
}))

const { default: ItemRoute } = await import('../../../app/(library)/item/[id]')
const { setEnabledItems } = await import('@ihsaanly/state/plan/enabled-store')
const { setPlace } = await import('@ihsaanly/state/location/store')
const { toggleKnown } = await import('@ihsaanly/state/memorise/store')
const { uncompleteItem } = await import('@ihsaanly/state/plan/completions')

const TASBIH = 'tasbih-after-prayer'
const MORNING = 'morning-adhkar'
const SIWAK = 'siwak-before-prayer'
const initialPreferences = getNotificationPreferences()

let shares: { message?: string }[] = []

const last = (): ItemProps => {
  const props = itemProps.at(-1)
  if (!props) throw new Error('ItemScreen did not render')
  return props
}

function open(id: string): void {
  router.params = { id }
  renderScreen(<ItemRoute />)
}

beforeEach(() => {
  itemProps.length = 0
  haptics.length = 0
  sharing.available = true
  sharing.shared.length = 0
  capture.fail = false
  capture.calls.length = 0
  shares = []
  spyOn(Share, 'share').mockImplementation(async (content) => {
    shares.push(content)
    return { action: 'sharedAction', activityType: undefined }
  })
})

afterEach(() => {
  act(() => {
    setEnabledItems([])
    setNotificationPreferences(initialPreferences)
    for (const id of [TASBIH, MORNING, SIWAK]) uncompleteItem(id, new Date(), 'UTC')
  })
  mock.restore()
})

describe('an unknown item', () => {
  it('renders Not found with nothing to act on', () => {
    open('no-such-item')
    const props = last()
    expect(props.title).toBe(en.notFound.title)
    expect(props.item).toBeNull()
    expect(props.memoriseHref).toBeNull()
    expect(props.counter).toBeNull()
    expect(props.remind).toBeNull()
    expect(props.done).toBe(false)
    expect(props.onToday).toBe(false)
    expect(router.screens).toEqual([{ title: en.notFound.title }])
  })

  it('does nothing when its callbacks fire', async () => {
    open('no-such-item')
    await actAsync(() => {
      last().onToggleDone()
      last().onTapCounter()
      last().onToggleOnToday()
      last().onToggleRemind(true)
      last().onShareText()
      last().onShareImage()
    })
    expect(last().done).toBe(false)
    expect(last().onToday).toBe(false)
    expect(haptics).toEqual([])
    expect(shares).toEqual([])
    expect(capture.calls).toEqual([])
    expect(getNotificationPreferences()).toEqual(initialPreferences)
  })
})

describe('a repeated item with Arabic', () => {
  it('describes the item and links to memorising it', () => {
    open(TASBIH)
    const item = itemById(TASBIH)
    const props = last()
    expect(props.memoriseHref).toBe(`/item/memorise/${TASBIH}`)
    expect(props.item?.rulingHref).toBe(`/glossary?term=${item?.ruling}`)
    expect(props.item?.repeat).toBe(item?.repeat)
    expect(props.item?.parts).toEqual([])
    expect(props.counter).toEqual({ count: 0, target: item?.repeat ?? 0 })
    expect(router.screens).toHaveLength(1)
    expect(router.screens[0]?.title).not.toBe(en.notFound.title)
  })

  it('counts taps with a light haptic and completes on the last one', () => {
    open(TASBIH)
    const target = itemById(TASBIH)?.repeat ?? 0
    act(() => last().onTapCounter())
    act(() => last().onTapCounter())
    expect(last().counter?.count).toBe(2)
    expect(haptics).toEqual(['impact:light', 'impact:light'])
    expect(last().done).toBe(false)

    for (let tap = 2; tap < target; tap += 1) act(() => last().onTapCounter())
    expect(last().counter?.count).toBe(target)
    expect(haptics.at(-1)).toBe('notification:success')
    expect(last().done).toBe(true)
  })

  it('resets the counter', () => {
    open(TASBIH)
    act(() => last().onTapCounter())
    expect(last().counter?.count).toBe(1)
    act(() => last().onResetCounter())
    expect(last().counter?.count).toBe(0)
  })

  it('marks done and undoes it, which also clears the counter', () => {
    open(TASBIH)
    act(() => last().onTapCounter())
    act(() => last().onToggleDone())
    expect(last().done).toBe(true)
    expect(last().counter?.count).toBe(1)

    act(() => last().onToggleDone())
    expect(last().done).toBe(false)
    expect(last().counter?.count).toBe(0)
  })

  it('adds to and removes from Today', () => {
    open(TASBIH)
    expect(last().onToday).toBe(false)
    act(() => last().onToggleOnToday())
    expect(last().onToday).toBe(true)
    act(() => last().onToggleOnToday())
    expect(last().onToday).toBe(false)
  })

  it('shares the card as text', () => {
    open(TASBIH)
    act(() => last().onShareText())
    expect(shares).toHaveLength(1)
    expect(shares[0]?.message).toContain(itemById(TASBIH)?.arabic ?? '\0')
  })
})

describe('reminders', () => {
  it('offer no switch for an item that is not on Today', () => {
    open(MORNING)
    expect(last().remind).toBeNull()
  })

  it('offer no switch for an item tied to a prayer or an event', () => {
    open(TASBIH)
    act(() => last().onToggleOnToday())
    expect(last().remind).toBeNull()
  })

  it('offer no switch once the item is known', () => {
    open(MORNING)
    act(() => last().onToggleOnToday())
    expect(last().remind).not.toBeNull()
    act(() => toggleKnown(MORNING))
    expect(last().remind).toBeNull()
    act(() => toggleKnown(MORNING))
  })

  it('follow the window default for a window item and store a per-item choice', () => {
    open(MORNING)
    act(() => last().onToggleOnToday())
    expect(last().remind).toEqual({
      value: initialPreferences.windows,
      detail: en.item.remindWindow,
    })
    act(() => last().onToggleRemind(!initialPreferences.windows))
    expect(last().remind?.value).toBe(!initialPreferences.windows)
    expect(getNotificationPreferences().perItem[MORNING]).toBe(!initialPreferences.windows)
  })

  it('follow the look-ahead default for a day item', () => {
    open('fast-monday')
    act(() => last().onToggleOnToday())
    expect(last().remind).toEqual({
      value: initialPreferences.lookAhead,
      detail: en.item.remindLookAhead,
    })
    act(() => last().onToggleOnToday())
  })
})

describe('sharing the card as an image', () => {
  it('captures the card and hands the file to the share sheet', async () => {
    open(TASBIH)
    await actAsync(() => last().onShareImage())
    expect(capture.calls).toEqual([{ format: 'png', result: 'tmpfile', width: 1080 }])
    expect(sharing.shared).toEqual([
      { uri: 'file:///tmp/card.png', options: { mimeType: 'image/png', UTI: 'public.png' } },
    ])
    expect(shares).toEqual([])
  })

  it('shares text instead when the share sheet is unavailable', async () => {
    sharing.available = false
    open(TASBIH)
    await actAsync(() => last().onShareImage())
    expect(sharing.shared).toEqual([])
    expect(shares).toHaveLength(1)
  })

  it('shares text instead when capturing fails', async () => {
    capture.fail = true
    open(TASBIH)
    await actAsync(() => last().onShareImage())
    expect(sharing.shared).toEqual([])
    expect(shares).toHaveLength(1)
  })
})

describe('items with other shapes', () => {
  it('lists the parts of a compound item with their sources', () => {
    open(MORNING)
    const parts = last().item?.parts ?? []
    expect(parts.length).toBeGreaterThan(0)
    expect(parts.map((part) => part.id)).toEqual((itemById(MORNING)?.parts ?? []).map((p) => p.id))
    expect(parts.every((part) => part.title.length > 0)).toBe(true)
  })

  it('has no counter for a single recitation and no memorise link without Arabic', () => {
    open(SIWAK)
    expect(last().counter).toBeNull()
    expect(last().memoriseHref).toBeNull()
  })
})

describe('with a location', () => {
  const WEDNESDAY_DHUHR = new Date('2026-03-04T12:30:00Z')
  const OPEN_NOW = 'sunnah-before-dhuhr'

  beforeEach(() => {
    setSystemTime(WEDNESDAY_DHUHR)
    act(() => {
      setPlace({
        label: 'London',
        latitude: 51.5,
        longitude: -0.12,
        timeZone: 'Europe/London',
        source: 'city',
      })
      setEnabledItems([OPEN_NOW])
    })
  })

  afterEach(() => {
    setSystemTime()
    act(() => setPlace(null))
  })

  it('is on Today and not done while the planner has it open', () => {
    open(OPEN_NOW)
    expect(last().onToday).toBe(true)
    expect(last().done).toBe(false)
  })

  it('completes against the open window and leaves the plan', () => {
    open(OPEN_NOW)
    act(() => last().onToggleDone())
    expect(last().done).toBe(true)
    act(() => last().onToggleDone())
    expect(last().done).toBe(false)
  })
})
