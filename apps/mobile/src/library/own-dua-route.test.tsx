import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime, spyOn } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { act } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { Alert, type AlertButton } from 'react-native'
import { renderScreen } from '../../../../packages/ui/test/render'
import { router } from '../../test/router'

type OwnProps = ComponentProps<typeof import('@ihsaanly/ui/screens/own-dua').OwnDuaScreen>

const ownProps: OwnProps[] = []
mock.module('@ihsaanly/ui/screens/own-dua', () => ({
  OwnDuaScreen: (props: OwnProps): ReactElement => {
    ownProps.push(props)
    return <div data-testid="own-dua-screen" />
  },
}))

const haptics: string[] = []
mock.module('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
  notificationAsync: async (type: string) => void haptics.push(`notification:${type}`),
  impactAsync: async (style: string) => void haptics.push(`impact:${style}`),
}))

const { OwnDuaRoute } = await import('./own-dua-route')
const { deleteOwnDua, getOwnDuas, saveOwnDua } = await import('@ihsaanly/state/my-duas/store')
const { uncompleteItem } = await import('@ihsaanly/state/plan/completions')
const { setPlace } = await import('@ihsaanly/state/location/store')

const ID = 'mine-route'

const last = (): OwnProps => {
  const props = ownProps.at(-1)
  if (!props) throw new Error('OwnDuaScreen did not render')
  return props
}

beforeEach(() => {
  ownProps.length = 0
  haptics.length = 0
  saveOwnDua({
    id: ID,
    title: 'For my parents',
    arabic: 'رب ارحمهما',
    transliteration: null,
    text: 'My Lord, have mercy on them',
    repeat: 2,
    moment: 'evening',
  })
})

afterEach(() => {
  act(() => {
    deleteOwnDua(ID)
    uncompleteItem(ID, new Date(), 'UTC')
    uncompleteItem(ID, new Date(), 'Europe/London')
    setPlace(null)
  })
})

describe('OwnDuaRoute', () => {
  it('shows the dua as written, its moment named, with a way to edit it', () => {
    renderScreen(<OwnDuaRoute id={ID} />)
    expect(last().dua).toEqual({
      title: 'For my parents',
      arabic: 'رب ارحمهما',
      transliteration: null,
      text: 'My Lord, have mercy on them',
      repeat: 2,
      moment: en.myDuas.moment.evening,
    })
    expect(last().counter).toEqual({ count: 0, target: 2 })
    expect(last().editHref).toBe(`/my-dua?id=${ID}`)
    expect(router.screens.at(-1)).toEqual({ title: 'For my parents' })
  })

  it('is not found once the dua is gone', () => {
    renderScreen(<OwnDuaRoute id="mine-gone" />)
    expect(last().dua).toBeNull()
    expect(last().counter).toBeNull()
    expect(router.screens.at(-1)).toEqual({ title: en.notFound.title })
    act(() => last().onTapCounter())
    expect(haptics).toEqual([])
  })

  it('names no moment for a dua without one, and counts nothing for a single saying', () => {
    act(() => {
      saveOwnDua({
        id: ID,
        title: 'Once',
        arabic: null,
        transliteration: null,
        text: 'Words',
        repeat: 1,
        moment: null,
      })
    })
    renderScreen(<OwnDuaRoute id={ID} />)
    expect(last().dua?.moment).toBeNull()
    expect(last().counter).toBeNull()
  })

  it('counts to its repeat, then files it done; undo and reset clear it', () => {
    renderScreen(<OwnDuaRoute id={ID} />)
    act(() => last().onTapCounter())
    expect(last().counter).toEqual({ count: 1, target: 2 })
    act(() => last().onResetCounter())
    expect(last().counter).toEqual({ count: 0, target: 2 })
    act(() => last().onTapCounter())
    act(() => last().onTapCounter())
    expect(haptics).toEqual(['impact:light', 'impact:light', 'notification:success'])
    expect(last().done).toBe(true)

    // Each mark a second apart: two in the same millisecond would tie in the record.
    const at = Date.now()
    setSystemTime(new Date(at + 1000))
    act(() => last().onToggleDone())
    expect(last().done).toBe(false)
    expect(last().counter).toEqual({ count: 0, target: 2 })
    setSystemTime(new Date(at + 2000))
    act(() => last().onToggleDone())
    expect(last().done).toBe(true)
    setSystemTime()
  })

  it('is open on Today in its window, and done once marked there', () => {
    // An evening in London: the Asr window, which holds the evening moment.
    setSystemTime(new Date('2026-09-23T16:30:00Z'))
    act(() =>
      setPlace({
        label: 'London',
        latitude: 51.5,
        longitude: -0.12,
        timeZone: 'Europe/London',
        source: 'city',
      }),
    )
    try {
      renderScreen(<OwnDuaRoute id={ID} />)
      expect(last().done).toBe(false)
      act(() => last().onToggleDone())
      expect(last().done).toBe(true)
    } finally {
      setSystemTime()
    }
  })

  it('deletes only once confirmed, then goes back', () => {
    const alerts: AlertButton[][] = []
    const alert = spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      alerts.push(buttons ?? [])
    })
    try {
      renderScreen(<OwnDuaRoute id={ID} />)
      act(() => last().onDelete())
      expect(alert).toHaveBeenCalledWith(
        en.myDuas.deleteConfirm,
        en.myDuas.deleteBody,
        expect.any(Array),
      )
      expect(getOwnDuas().some((dua) => dua.id === ID)).toBe(true)
      const destructive = alerts[0]?.find((button) => button.style === 'destructive')
      act(() => destructive?.onPress?.())
      expect(getOwnDuas().some((dua) => dua.id === ID)).toBe(false)
      expect(router.calls).toEqual([['back']])
    } finally {
      alert.mockRestore()
    }
  })
})
