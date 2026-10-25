import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { StarterPreset } from '@ihsaanly/core/plan/presets'
import { act, render } from '@testing-library/react'
import { Alert, type AlertButton } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  current: StarterPreset | null
  onSelect: (preset: StarterPreset) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/starting-point', 'StartingPointScreen')

const alerts: { title: string; body: string; buttons: AlertButton[] }[] = []
const realAlert = Alert.alert

const { default: StartingPointRoute } = await import('../../app/(more)/starting-point')
const { items } = await import('@ihsaanly/core/content')
const { idsForPreset } = await import('@ihsaanly/core/plan/presets')
const { getEnabledItems, setEnabledItems } = await import('@ihsaanly/state/plan/enabled-store')
const { getStrings } = await import('@ihsaanly/state/strings')

const starting = idsForPreset('starting', items)
const sorted = (ids: string[]): string[] => [...ids].sort()

describe('starting point route', () => {
  beforeEach(() => {
    renders.length = 0
    alerts.length = 0
    Alert.alert = (title, body, buttons) => {
      alerts.push({ title: title ?? '', body: body ?? '', buttons: buttons ?? [] })
    }
  })

  afterEach(() => {
    Alert.alert = realAlert
  })

  it('shows the preset the enabled items equal, and switches without asking', () => {
    setEnabledItems(starting)
    render(<StartingPointRoute />)
    expect(last(renders).current).toBe('starting')

    act(() => last(renders).onSelect('everything'))

    expect(alerts).toEqual([])
    expect(last(renders).current).toBe('everything')
  })

  it('asks before replacing a hand-made set, and replaces it only on Replace', () => {
    const own = [...starting, 'witr']
    setEnabledItems(own)
    render(<StartingPointRoute />)
    expect(last(renders).current).toBeNull()

    act(() => last(renders).onSelect('essentials'))

    const copy = getStrings().startingPoint
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.title).toBe(copy.confirmTitle)
    expect(alerts[0]?.body).toBe(copy.confirmBody)
    const [cancel, replace] = alerts[0]?.buttons ?? []
    expect(cancel).toMatchObject({ text: copy.cancel, style: 'cancel' })
    expect(replace).toMatchObject({ text: copy.confirm, style: 'destructive' })
    expect(sorted(getEnabledItems())).toEqual(sorted(own))

    act(() => replace?.onPress?.())

    expect(sorted(getEnabledItems())).toEqual(sorted(idsForPreset('essentials', items)))
    expect(last(renders).current).toBe('essentials')
  })
})
