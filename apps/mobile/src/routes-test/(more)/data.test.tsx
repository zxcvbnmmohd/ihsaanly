import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { Account, Cloud } from '@ihsaanly/cloud/ports'
import { act, render } from '@testing-library/react'
import { Alert, type AlertButton } from 'react-native'
import { flush, last, mockScreen, mockShareNative, type ShareNative } from '../../../test/more'
import { router } from '../../../test/router'

interface Props {
  message: string | null
  onExport: () => void
  onImport: () => void
  onDiagnostics: () => void
  onDelete: () => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/data', 'DataScreen')
const native: ShareNative = mockShareNative()

const alerts: { title: string; body: string; buttons: AlertButton[] }[] = []
const realAlert = Alert.alert

const { default: DataRoute } = await import('../../app/(more)/data')
const { buildExport } = await import('@/data/export')
const { wipe, writePreferenceRow } = await import('@ihsaanly/state/storage/backend')
const { allActions, recordEvent, reloadEvents } = await import('@ihsaanly/state/storage/events')
const { getStrings } = await import('@ihsaanly/state/strings')
const { startCloud } = await import('@ihsaanly/state/cloud/session')
const { ACCOUNT_KEY } = await import('@ihsaanly/state/cloud/keys')

const strings = getStrings()
const _settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const press = async (action: () => void): Promise<void> => {
  await flush(() => action())
}

const exported = (): string => {
  wipe()
  reloadEvents()
  recordEvent({
    kind: 'prayer-performed',
    subject: 'fajr',
    at: new Date('2026-03-01T05:00:00Z'),
    logDay: '2026-03-01',
  })
  const text = JSON.stringify(buildExport())
  wipe()
  reloadEvents()
  return text
}

describe('data route', () => {
  beforeEach(() => {
    renders.length = 0
    alerts.length = 0
    native.sharingAvailable = true
    native.shared.length = 0
    native.written = {}
    native.deleted.length = 0
    native.deleteThrows = false
    native.reloads.length = 0
    native.picked = { size: 10, text: '', throws: false }
    native.pick = async () => ({ canceled: false, assets: [{ uri: 'file:///picked.json' }] })
    Alert.alert = (title, body, buttons) => {
      alerts.push({ title: title ?? '', body: body ?? '', buttons: buttons ?? [] })
    }
    wipe()
    reloadEvents()
  })

  afterEach(() => {
    Alert.alert = realAlert
  })

  it('opens diagnostics', () => {
    render(<DataRoute />)
    act(() => last(renders).onDiagnostics())
    expect(router.calls).toEqual([['push', '/diagnostics']])
  })

  describe('export', () => {
    it('shares the export file and shows no message', async () => {
      render(<DataRoute />)
      await press(() => last(renders).onExport())
      expect(native.shared).toEqual(['file:///cache/ihsaanly-data.json'])
      expect(JSON.parse(native.written['ihsaanly-data.json'] ?? '{}')).toMatchObject({
        format: 'ihsaanly-export',
      })
      expect(native.deleted).toEqual(['file:///cache/ihsaanly-data.json'])
      expect(last(renders).message).toBeNull()
    })

    it('says so when the share sheet is unavailable', async () => {
      native.sharingAvailable = false
      render(<DataRoute />)
      await press(() => last(renders).onExport())
      expect(native.shared).toEqual([])
      expect(last(renders).message).toBe(strings.data.shareFailed)
    })
  })

  describe('import', () => {
    it('adds the events from a valid export and reports how many', async () => {
      native.picked.text = exported()
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(allActions().map((a) => [a.kind, a.subject])).toEqual([['prayer-performed', 'fajr']])
      expect(last(renders).message).toBe(strings.data.imported(1))
    })

    it('reports zero added when everything is already there', async () => {
      native.picked.text = exported()
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      await press(() => last(renders).onImport())
      expect(allActions()).toHaveLength(1)
      expect(last(renders).message).toBe(strings.data.imported(0))
    })

    it('does nothing when the picker is cancelled', async () => {
      native.pick = async () => ({ canceled: true })
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBeNull()
    })

    it('does nothing when the picker returns no file', async () => {
      native.pick = async () => ({ canceled: false, assets: [] })
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBeNull()
    })

    it('refuses a file over the size limit without reading it', async () => {
      native.picked = { size: 8 * 1024 * 1024 + 1, text: exported(), throws: true }
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBe(strings.data.importFailed)
      expect(allActions()).toEqual([])
    })

    it('treats an unknown size as small enough to read', async () => {
      native.picked = { size: null, text: exported(), throws: false }
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBe(strings.data.imported(1))
    })

    it('refuses a file that is not one of ours', async () => {
      native.picked.text = '{"hello":"world"}'
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBe(strings.data.importFailed)
    })

    it('answers when the file cannot be read', async () => {
      native.picked.throws = true
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBe(strings.data.importFailed)
    })

    it('answers when the picker itself fails', async () => {
      native.pick = () => Promise.reject(new Error('no picker'))
      render(<DataRoute />)
      await press(() => last(renders).onImport())
      expect(last(renders).message).toBe(strings.data.importFailed)
    })
  })

  describe('delete', () => {
    it('confirms, then wipes and reloads only on the destructive button', async () => {
      recordEvent({
        kind: 'prayer-performed',
        subject: 'fajr',
        at: new Date('2026-03-01T05:00:00Z'),
        logDay: '2026-03-01',
      })
      render(<DataRoute />)
      act(() => last(renders).onDelete())

      const [alert] = alerts
      expect(alerts).toHaveLength(1)
      expect(alert?.title).toBe(strings.data.deleteConfirmTitle)
      expect(alert?.body).toBe(strings.data.deleteConfirmBody)
      expect(alert?.buttons.map((b) => [b.text, b.style])).toEqual([
        [strings.data.cancel, 'cancel'],
        [strings.data.deleteConfirm, 'destructive'],
      ])
      // Cancel has no handler: nothing is wiped.
      expect(allActions()).toHaveLength(1)
      expect(native.reloads).toEqual([])

      await press(() => alert?.buttons[1]?.onPress?.())
      reloadEvents()
      expect(allActions()).toEqual([])
      expect(native.reloads).toHaveLength(1)
    })

    it('says the account keeps its own copy when signed in', async () => {
      let emit: (account: Account | null) => void = () => {}
      writePreferenceRow(ACCOUNT_KEY, JSON.stringify({ signedIn: true }))
      const stop = startCloud(
        async () =>
          ({
            auth: {
              onChange: (handler: (account: Account | null) => void) => {
                emit = handler
                return () => {}
              },
            },
          }) as unknown as Cloud,
      )
      try {
        await flush()
        render(<DataRoute />)
        act(() =>
          emit({
            uid: 'u1',
            email: null,
            displayName: null,
            provider: 'google',
            providers: ['google'],
          }),
        )
        await flush()
        act(() => last(renders).onDelete())
        expect(alerts[0]?.body).toBe(strings.data.deleteConfirmBodySignedIn)
      } finally {
        stop()
        wipe()
      }
    })
  })
})
