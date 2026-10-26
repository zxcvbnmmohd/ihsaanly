import '../../../test/more'
import { afterEach, describe, expect, it } from 'bun:test'
import { WIDGET_GALLERY_HREF } from '@ihsaanly/ui/props/more'
import { act, render } from '@testing-library/react'
import { Platform } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  model: { ink: unknown; rightNow: { title: string } | null }
  platform: 'ios' | 'android'
  coach: {
    target: string
    step: number
    total: number
    onNext: () => void
    onSkip: () => void
  } | null
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/widgets', 'WidgetsScreen')

const { default: WidgetsRoute } = await import('../../app/(more)/widgets')
const { themePreferenceStore } = await import('@/theme/preference')
const { widgetInk } = await import('@/widgets/model')
const tours = await import('@ihsaanly/state/coach/tours')

const os = Platform.OS

afterEach(() => {
  renders.length = 0
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
  act(() => themePreferenceStore.set('system'))
})

describe('widgets route', () => {
  it('is the /widgets the gallery link names', () => {
    expect(WIDGET_GALLERY_HREF).toBe('/widgets')
  })

  it('hands the screen the widgets’ entry in the chosen theme, and follows a change', () => {
    render(<WidgetsRoute />)
    expect(last(renders).model.ink).toEqual(widgetInk(undefined))
    act(() => themePreferenceStore.set('midnight'))
    expect(last(renders).model.ink).toEqual(widgetInk('midnight'))
  })

  it('shows the iOS gallery, with its Lock Screen, off Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true })
    render(<WidgetsRoute />)
    expect(last(renders).platform).toBe('ios')
  })

  it('shows the Android gallery on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true })
    render(<WidgetsRoute />)
    expect(last(renders).platform).toBe('android')
  })

  it('tours the sizes, then a live preview, on first use only', () => {
    act(() => tours.resetCoachTours())
    render(<WidgetsRoute />)
    expect(last(renders).coach).toMatchObject({ target: 'choose', step: 0, total: 2 })
    act(() => last(renders).coach?.onNext())
    expect(last(renders).coach).toMatchObject({ target: 'preview', step: 1 })
    act(() => last(renders).coach?.onNext())
    expect(last(renders).coach).toBeNull()
    render(<WidgetsRoute />)
    expect(last(renders).coach).toBeNull()
  })

  it('ends the tour on Skip', () => {
    act(() => tours.resetCoachTours())
    render(<WidgetsRoute />)
    act(() => last(renders).coach?.onSkip())
    expect(last(renders).coach).toBeNull()
  })
})
