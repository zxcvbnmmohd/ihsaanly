import '../../../test/more'
import { afterEach, describe, expect, it } from 'bun:test'
import { WIDGET_GALLERY_HREF } from '@ihsaanly/ui/props/more'
import { act, render } from '@testing-library/react'
import { Platform } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Props {
  model: { ink: unknown; rightNow: { title: string } | null }
  platform: 'ios' | 'android'
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/widgets', 'WidgetsScreen')

const { default: WidgetsRoute } = await import('../../app/(more)/widgets')
const { setAccent } = await import('@ihsaanly/state/theme/accent-store')
const { widgetInk } = await import('@/widgets/model')

const os = Platform.OS

afterEach(() => {
  renders.length = 0
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
  act(() => setAccent('terracotta'))
})

describe('widgets route', () => {
  it('is the /widgets the gallery link names', () => {
    expect(WIDGET_GALLERY_HREF).toBe('/widgets')
  })

  it('hands the screen the widgets’ entry in the chosen accent, and follows a change', () => {
    render(<WidgetsRoute />)
    expect(last(renders).model.ink).toEqual(widgetInk('terracotta'))
    act(() => setAccent('denim'))
    expect(last(renders).model.ink).toEqual(widgetInk('denim'))
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
})
