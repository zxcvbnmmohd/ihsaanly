import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@ihsaanly/core/plan/notification-preferences'
import * as restore from '@ihsaanly/state/cloud/restore'
import { setNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { act, render } from '@testing-library/react'
import { BackHandler } from 'react-native'
import { installProviderButtons, installSafeArea, screens } from '../../test/accounts'
import { run, settle } from '../../test/act'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'
import { installAppearance, restoreAppearance } from '../../test/theme'

installSafeArea(20)
installProviderButtons()
installReminderFakes()
const { RestoreAccount } = await import('./restore')

interface RestoreProps {
  outcome: string
  onBackToSetup: () => void
  onContinueSetup: () => void
  reminders?: { onAllow: () => void; onNotNow: () => void }
}
const latest = (): RestoreProps => (screens.account.at(-1) as { restore: RestoreProps }).restore

let outcome = 'idle'
let backHandlers: (() => boolean)[] = []
let backRemoved = 0
const spies: { mockRestore: () => void }[] = []

function mount(): {
  calls: { back: number; continue: number; restored: number }
  view: ReturnType<typeof render>
} {
  const calls = { back: 0, continue: 0, restored: 0 }
  const view = render(
    <RestoreAccount
      onBackToSetup={() => {
        calls.back += 1
      }}
      onContinueSetup={() => {
        calls.continue += 1
      }}
      onRestored={() => {
        calls.restored += 1
      }}
    />,
  )
  return { calls, view }
}

beforeEach(() => {
  installProviderButtons()
  installAppearance()
  resetReminderFakes()
  installReminderFakes()
  screens.account = []
  outcome = 'idle'
  backHandlers = []
  backRemoved = 0
  spies.push(spyOn(restore, 'useRestoreOutcome').mockImplementation((() => outcome) as never))
  spies.push(
    spyOn(BackHandler, 'addEventListener').mockImplementation(((
      _event: string,
      handler: () => boolean,
    ) => {
      backHandlers.push(handler)
      return {
        remove: () => {
          backRemoved += 1
        },
      }
    }) as never),
  )
  setNotificationPreferences({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    windows: false,
    lookAhead: false,
    prayers: false,
  })
})
afterEach(() => {
  for (const created of spies.splice(0)) created.mockRestore()
  restoreAppearance()
})

describe('RestoreAccount', () => {
  it('shows the Account screen in restore mode, below the status bar', () => {
    outcome = 'restoring'
    const { view } = mount()
    expect(latest().outcome).toBe('restoring')
    expect((view.container.firstElementChild as HTMLElement).style.paddingTop).toBe('20px')
  })

  it('hands Back to the welcome step and swallows the press, and stops listening on unmount', () => {
    const { calls, view } = mount()
    expect(backHandlers[0]?.()).toBe(true)
    expect(calls.back).toBe(1)
    view.unmount()
    expect(backRemoved).toBe(1)
  })

  it('passes the screen its own back and continue actions', () => {
    const { calls } = mount()
    latest().onBackToSetup()
    latest().onContinueSetup()
    expect([calls.back, calls.continue]).toEqual([1, 1])
  })

  it('does not finish while still syncing or signed out', async () => {
    const { calls } = mount()
    await settle()
    expect(calls.restored).toBe(0)
  })

  it('finishes straight away when the restored account has no reminders on', async () => {
    outcome = 'restored'
    const { calls } = mount()
    await settle()
    expect(calls.restored).toBe(1)
    expect(latest().reminders).toBeUndefined()
  })

  it.each(['granted', 'denied'] as const)(
    'finishes when reminders are on and permission is %s',
    async (state) => {
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, windows: true })
      fake.permissions =
        state === 'granted'
          ? { granted: true, canAskAgain: true }
          : { granted: false, canAskAgain: false }
      outcome = 'restored'
      const { calls } = mount()
      await settle()
      expect(calls.restored).toBe(1)
      expect(latest().reminders).toBeUndefined()
    },
  )

  it.each(['windows', 'lookAhead', 'prayers'] as const)(
    'asks about reminders when %s arrived on and this phone was never asked',
    async (key) => {
      setNotificationPreferences({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        windows: false,
        lookAhead: false,
        prayers: false,
        [key]: true,
      })
      outcome = 'restored'
      const { calls } = mount()
      await settle()
      expect(calls.restored).toBe(0)
      expect(latest().reminders).toBeDefined()
    },
  )

  async function offered(): Promise<ReturnType<typeof mount>> {
    setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, windows: true })
    outcome = 'restored'
    const mounted = mount()
    await settle()
    return mounted
  }

  it('asks the OS for permission on Allow, then finishes', async () => {
    const { calls } = await offered()
    await run(async () => {
      latest().reminders?.onAllow()
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    expect(fake.categories.length).toBeGreaterThan(0)
    expect(calls.restored).toBe(1)
  })

  it('finishes even when the permission prompt fails', async () => {
    const { calls } = await offered()
    fake.failing.add('getPermissionsAsync')
    await run(async () => {
      latest().reminders?.onAllow()
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    expect(calls.restored).toBe(1)
  })

  it('finishes on Not now without asking', async () => {
    const { calls } = await offered()
    act(() => latest().reminders?.onNotNow())
    expect(calls.restored).toBe(1)
    expect(fake.categories).toEqual([])
  })

  it('does nothing if it is closed before the permission check returns', async () => {
    setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, windows: true })
    outcome = 'restored'
    const { calls, view } = mount()
    view.unmount()
    await settle()
    expect(calls.restored).toBe(0)
  })
})
