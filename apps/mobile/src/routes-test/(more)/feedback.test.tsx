import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import type { FeedbackDiagnostics, FeedbackKind } from '@ihsaanly/cloud/ports'
import { act, render } from '@testing-library/react'
import { act as reactAct } from 'react'
import { Linking, Platform } from 'react-native'
import { flush, last, mockScreen, mockShareNative } from '../../../test/more'
import { router } from '../../../test/router'

interface Props {
  signedIn: boolean
  accountEmail: string | null
  kind: FeedbackKind
  onKind: (kind: FeedbackKind) => void
  message: string
  onMessage: (message: string) => void
  contactEmail: string
  onContactEmail: (email: string) => void
  includeDiagnostics: boolean
  onIncludeDiagnostics: (include: boolean) => void
  diagnosticsPreview: string | null
  previewShown: boolean
  onTogglePreview: () => void
  status: string
  errorCode: string | null
  onSend: () => void
  onRetry: () => void
  onSignIn: () => void
  onDone: () => void
  onSendAnother: () => void
  supportEmailHref: string
  privacyHref: string
  onOpenLink: (url: string) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/feedback', 'FeedbackScreen')
mockShareNative()
// StoreClient (Expo Go) means no reminders API, so the report builds without expo-notifications.
mock.module('expo-constants', () => ({
  default: { expoConfig: { version: '3.1.4' }, executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}))

const { default: FeedbackRoute } = await import('../../app/(more)/feedback')
const { createMemoryAuth } = await import('@ihsaanly/cloud/memory/auth')
const { createMemoryFeedback } = await import('@ihsaanly/cloud/memory/feedback')
const { createMemorySyncRemote } = await import('@ihsaanly/cloud/memory/sync-remote')
const session = await import('@ihsaanly/state/cloud/session')
const { LEGAL_URLS } = await import('@/cloud')
const { FEEDBACK_OUTBOX_KEY } = await import('@ihsaanly/state/cloud/keys')
const { writePreferenceRow } = await import('@ihsaanly/state/storage/backend')

const platform = Platform as { OS: string }
let stopCloud: (() => void) | null = null

async function signedIn(): Promise<ReturnType<typeof createMemoryFeedback>> {
  const feedback = createMemoryFeedback()
  const cloud = {
    auth: createMemoryAuth({ uid: 'me' }),
    remote: createMemorySyncRemote(),
    feedback,
  }
  stopCloud = session.startCloud(async () => cloud, { debounceMs: 5 })
  await session.signIn('google')
  return feedback
}

/** React's async act, without flush()'s timer: the next step runs before slower work lands. */
const settle = (work: () => Promise<void>): Promise<void> => reactAct(work)

const typed = async (message: string): Promise<void> => {
  await flush(() => last(renders).onMessage(message))
}

describe('feedback route', () => {
  beforeEach(() => {
    renders.length = 0
    platform.OS = 'ios'
    // Whatever an earlier test left queued would go first on sign-in.
    writePreferenceRow(FEEDBACK_OUTBOX_KEY, '[]')
  })

  afterEach(async () => {
    platform.OS = 'web'
    await session.signOut('keep')
    stopCloud?.()
    stopCloud = null
  })

  it('signed out: offers sign-in (to Account) and the support address', async () => {
    const open = spyOn(Linking, 'openURL').mockImplementation(async () => {})
    try {
      render(<FeedbackRoute />)
      const props = last(renders)
      expect(props.signedIn).toBe(false)
      expect(props.accountEmail).toBeNull()
      expect(props.supportEmailHref).toBe('mailto:support@ihsaanly.app')
      expect(props.privacyHref).toBe(LEGAL_URLS.privacy)
      act(() => props.onSignIn())
      expect(router.calls).toContainEqual(['push', '/account'])
      props.onOpenLink('mailto:support@ihsaanly.app')
      expect(open).toHaveBeenCalledWith('mailto:support@ihsaanly.app')
    } finally {
      open.mockRestore()
    }
  })

  it('prefills the account email once, then leaves the field to the user', async () => {
    await signedIn()
    render(<FeedbackRoute />)
    await flush()
    expect(last(renders).contactEmail).toBe('google@example.test')
    expect(last(renders).accountEmail).toBe('google@example.test')
    await flush(() => last(renders).onContactEmail(''))
    await flush()
    expect(last(renders).contactEmail).toBe('')
  })

  it('sends from iOS with the app and device details, then offers another', async () => {
    const feedback = await signedIn()
    render(<FeedbackRoute />)
    await flush()
    await flush(() => last(renders).onKind('idea'))
    await typed('Widgets in Urdu')
    await flush(() => last(renders).onSend())
    expect(last(renders).status).toBe('sent')
    expect(feedback.sent).toHaveLength(1)
    expect(feedback.sent[0]).toMatchObject({
      uid: 'me',
      kind: 'idea',
      message: 'Widgets in Urdu',
      contactEmail: 'google@example.test',
      app: {
        surface: 'ios',
        version: '3.1.4',
        locale: 'en-US',
        os: `ios ${String(Platform.Version)}`,
      },
      diagnostics: null,
    })

    await flush(() => last(renders).onSendAnother())
    expect(last(renders)).toMatchObject({ status: 'idle', message: '', kind: 'bug' })
  })

  it('names Android as the surface there', async () => {
    platform.OS = 'android'
    const feedback = await signedIn()
    render(<FeedbackRoute />)
    await flush()
    await typed('Hello')
    await flush(() => last(renders).onSend())
    expect(feedback.sent[0]?.app.surface).toBe('android')
  })

  it('reports a rate limit and retries what is queued', async () => {
    const feedback = await signedIn()
    render(<FeedbackRoute />)
    await flush()
    await typed('First')
    await flush(() => last(renders).onSend())
    await flush(() => last(renders).onSendAnother())
    await typed('Second')
    await flush(() => last(renders).onSend())
    expect(last(renders)).toMatchObject({ status: 'error', errorCode: 'rate-limited' })
    await flush(() => last(renders).onRetry())
    expect(last(renders)).toMatchObject({ status: 'error', errorCode: 'rate-limited' })
    expect(feedback.sent.map((sent) => sent.message)).toEqual(['First'])
  })

  it('attaches the report when switched on, previewing exactly what is sent', async () => {
    const feedback = await signedIn()
    render(<FeedbackRoute />)
    await flush()
    await typed('Reminders are late')
    expect(last(renders).diagnosticsPreview).toBeNull()
    await flush(() => last(renders).onIncludeDiagnostics(true))
    const preview = last(renders).diagnosticsPreview
    expect(preview).not.toBeNull()
    await flush(() => last(renders).onTogglePreview())
    expect(last(renders).previewShown).toBe(true)
    await flush(() => last(renders).onSend())
    expect(JSON.stringify(feedback.sent[0]?.diagnostics, null, 2)).toBe(preview ?? '')
    const diagnostics = feedback.sent[0]?.diagnostics as FeedbackDiagnostics
    expect(diagnostics.app.version).toBe('3.1.4')
    expect(diagnostics.reminders).toEqual({ permission: 'unavailable', pending: 0 })
  })

  it('opens with the report attached from Diagnostics (?diagnostics=1)', async () => {
    router.params = { diagnostics: '1' }
    render(<FeedbackRoute />)
    expect(renders[0]?.includeDiagnostics).toBe(true)
    await flush()
    expect(last(renders).diagnosticsPreview).toContain('"eventCounts"')
  })

  it('gathers the report itself when Send comes before it is ready', async () => {
    const feedback = await signedIn()
    render(<FeedbackRoute />)
    await flush()
    await typed('Quick')
    await settle(async () => {
      last(renders).onIncludeDiagnostics(true)
    })
    await settle(async () => {
      last(renders).onSend()
    })
    await flush()
    expect(feedback.sent[0]?.diagnostics).not.toBeNull()
  })

  it('drops a report that finishes after the screen closed', async () => {
    router.params = { diagnostics: '1' }
    const view = render(<FeedbackRoute />)
    const before = renders.length
    view.unmount()
    await flush()
    expect(renders).toHaveLength(before)
  })

  it('goes back when done, and resets the status for the next visit', async () => {
    await signedIn()
    const view = render(<FeedbackRoute />)
    await flush()
    await typed('Thanks')
    await flush(() => last(renders).onSend())
    await flush(() => last(renders).onDone())
    expect(router.calls).toContainEqual(['back'])
    expect(last(renders).status).toBe('idle')
    view.unmount()
  })
})
