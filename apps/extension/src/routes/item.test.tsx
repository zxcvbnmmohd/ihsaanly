import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { itemById, resolveText } from '@ihsaanly/core/content'
import type { Place } from '@ihsaanly/core/location/place'
import { setPlace } from '@ihsaanly/state/location/store'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { getEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { screen, waitFor } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

const makkah: Place = {
  label: 'Makkah, Saudi Arabia',
  latitude: 21.4225,
  longitude: 39.8262,
  timeZone: 'Asia/Riyadh',
  source: 'city',
}

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share')

/** 14:00 in Makkah: the morning adhkar window has closed, so a completion reads as done. */
const AFTERNOON = new Date('2027-02-20T11:00:00Z')

/** The counter's "3 / 33", without the spacing it is laid out with. */
const progress = (counter: HTMLElement): string => (counter.textContent ?? '').replace(/\s/g, '')

const titleOf = (id: string): string => resolveText(itemById(id)?.title) ?? id

beforeEach(() => {
  resetApp()
  setSystemTime(AFTERNOON)
  setPlace(makkah)
})
afterEach(() => {
  setSystemTime()
  for (const [key, descriptor] of [
    ['clipboard', clipboardDescriptor],
    ['share', shareDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(navigator, key, descriptor)
    else delete (navigator as unknown as Record<string, unknown>)[key]
  }
})

describe('/item/$id', () => {
  it('says so for an item that does not exist', async () => {
    await renderRoute('/item/no-such-item')
    expect(
      await screen.findByRole('heading', { level: 1, name: strings.notFound.title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.item.done })).toBeNull()
  })

  it('shows the item and its parts, with a back button', async () => {
    const { user, router } = await renderRoute(['/', '/item/morning-adhkar'])
    expect(
      await screen.findByRole('heading', { level: 1, name: titleOf('morning-adhkar') }),
    ).toBeInTheDocument()
    expect(screen.getByText(strings.item.parts)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: strings.onboarding.back }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('marks an item done and takes it back', async () => {
    const { user } = await renderRoute('/item/morning-adhkar')
    await user.click(await screen.findByRole('button', { name: strings.item.done }))
    await user.click(await screen.findByRole('button', { name: strings.item.undo }))
    expect(await screen.findByRole('button', { name: strings.item.done })).toBeInTheDocument()
  })

  it('counts a repeated dhikr, can start again, and completes the item at the target', async () => {
    const { user } = await renderRoute('/item/tasbih-after-prayer')
    const counter = await screen.findByRole('button', { name: titleOf('tasbih-after-prayer') })
    await user.click(counter)
    expect(progress(counter)).toBe('1/33')

    await user.click(screen.getByRole('button', { name: strings.item.counterReset }))
    expect(progress(counter)).toBe('0/33')

    for (let tap = 0; tap < 33; tap += 1) await user.click(counter)
    // Completed: the item is recorded done and the counter gives way to Undo.
    expect(await screen.findByRole('button', { name: strings.item.undo })).toBeInTheDocument()
  })

  it('puts an item on Today and takes it off', async () => {
    const { user } = await renderRoute('/item/siwak-before-prayer')
    const toggle = await screen.findByRole('switch', { name: new RegExp(strings.item.onToday) })
    expect(getEnabledItems()).not.toContain('siwak-before-prayer')

    await user.click(toggle)
    expect(getEnabledItems()).toContain('siwak-before-prayer')
    await user.click(toggle)
    expect(getEnabledItems()).not.toContain('siwak-before-prayer')
  })

  it('turns reminders for one item on and off', async () => {
    const { user } = await renderRoute('/item/morning-adhkar')
    const remind = await screen.findByRole('switch', { name: new RegExp(strings.item.remind) })
    const was = getNotificationPreferences().windows

    await user.click(remind)
    expect(getNotificationPreferences().perItem['morning-adhkar']).toBe(!was)
  })

  it('shares the card as text through the share sheet, for either button', async () => {
    const shared: ShareData[] = []
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        shared.push(data)
      },
    })
    const { user } = await renderRoute('/item/morning-adhkar')
    await user.click(await screen.findByText(strings.item.shareText))
    await user.click(screen.getByText(strings.item.shareImage))

    await waitFor(() => expect(shared).toHaveLength(2))
    expect(shared[0]?.text).toContain(titleOf('morning-adhkar'))
    expect(shared[0]?.text).toContain(strings.item.sharedFrom)
    expect(shared[1]).toEqual(shared[0])
  })
})
