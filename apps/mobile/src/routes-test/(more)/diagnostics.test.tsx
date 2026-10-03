import '../../../test/more'
import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, render } from '@testing-library/react'
import { flush, last, mockScreen, mockShareNative, type ShareNative } from '../../../test/more'
import { router } from '../../../test/router'

interface Summary {
  version: string
  device: string
  reminders: { permission: string; pending: number }
}
interface Props {
  summary: Summary | null
  raw: string
  showingRaw: boolean
  message: string | null
  onToggleRaw: () => void
  onSend: () => void
  onCancel: () => void
  onReportProblem?: (() => void) | undefined
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/diagnostics', 'DiagnosticsScreen')
const native: ShareNative = mockShareNative()
// StoreClient (Expo Go) means no reminders API, so the bundle builds without expo-notifications.
mock.module('expo-constants', () => ({
  default: { expoConfig: { version: '3.1.4' }, executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}))

// `cloudEnabled` is false in tests; the shortcut to Feedback needs it on.
const realCloud = { ...(await import('@/cloud')) }
const setCloud = (cloudEnabled: boolean): void => {
  mock.module('@/cloud', () => ({ ...realCloud, cloudEnabled }))
}
afterAll(() => setCloud(realCloud.cloudEnabled))

const { default: DiagnosticsRoute } = await import('../../app/(more)/diagnostics')
const { getStrings } = await import('@ihsaanly/state/strings')

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('diagnostics route', () => {
  beforeEach(() => {
    renders.length = 0
    native.sharingAvailable = true
    native.shared.length = 0
    native.written = {}
    native.deleted.length = 0
  })

  it('renders empty for a frame, then summarises the built bundle', async () => {
    render(<DiagnosticsRoute />)
    expect(renders[0]?.summary).toBeNull()
    expect(renders[0]?.raw).toBe('')

    await flush()
    const props = last(renders)
    expect(props.summary?.version).toBe('3.1.4')
    expect(props.summary?.device).toContain('Acme Phone 1')
    expect(props.summary?.reminders).toEqual({ permission: 'unavailable', pending: 0 })
    expect(JSON.parse(props.raw).app.version).toBe('3.1.4')
  })

  it('toggles the raw view', async () => {
    render(<DiagnosticsRoute />)
    await flush()
    expect(last(renders).showingRaw).toBe(false)
    act(() => last(renders).onToggleRaw())
    expect(last(renders).showingRaw).toBe(true)
    act(() => last(renders).onToggleRaw())
    expect(last(renders).showingRaw).toBe(false)
  })

  it('sends exactly the bundle that was shown, then goes back', async () => {
    render(<DiagnosticsRoute />)
    await flush()
    const shown = last(renders).raw
    await flush(() => last(renders).onSend())
    expect(native.written['ihsaanly-diagnostics.json']).toBe(shown)
    expect(native.shared).toEqual(['file:///cache/ihsaanly-diagnostics.json'])
    expect(router.calls).toEqual([['back']])
  })

  it('stays and says so when sharing is unavailable', async () => {
    native.sharingAvailable = false
    render(<DiagnosticsRoute />)
    await flush()
    await flush(() => last(renders).onSend())
    expect(last(renders).message).toBe(getStrings().data.shareFailed)
    expect(router.calls).toEqual([])
  })

  it('sends nothing before the bundle is built', () => {
    render(<DiagnosticsRoute />)
    act(() => renders[0]?.onSend())
    expect(native.shared).toEqual([])
  })

  it('offers "Report this problem" only with a cloud, opening Feedback with the report', async () => {
    render(<DiagnosticsRoute />)
    expect(last(renders).onReportProblem).toBeUndefined()
    setCloud(true)
    try {
      render(<DiagnosticsRoute />)
      act(() => last(renders).onReportProblem?.())
      expect(router.calls).toEqual([['push', '/feedback?diagnostics=1']])
    } finally {
      setCloud(false)
    }
  })

  it('goes back on cancel', async () => {
    render(<DiagnosticsRoute />)
    await flush()
    act(() => last(renders).onCancel())
    expect(router.calls).toEqual([['back']])
  })

  it('ignores a bundle that finishes building after the screen closed', async () => {
    const view = render(<DiagnosticsRoute />)
    const before = renders.length
    view.unmount()
    await settle()
    expect(renders).toHaveLength(before)
  })
})
