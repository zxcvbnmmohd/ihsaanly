import type { FeedbackDiagnostics, FeedbackKind } from '@ihsaanly/cloud/ports'
import { useAccount } from '@ihsaanly/state/cloud/session'
import {
  buildFeedbackDiagnostics,
  dismissFeedbackStatus,
  retryFeedback,
  sendFeedback,
  useFeedback,
} from '@ihsaanly/state/feedback/store'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { FeedbackScreen } from '@ihsaanly/ui/screens/feedback'
import type { PermissionStatus } from '@ihsaanly/ui/types'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { BADGE_ALARM } from '~/alarms'
import { PageHeader } from '~/components/page-header'
import { LEGAL } from '~/legal'
import { useExtensionStrings } from '~/strings'

export const Route = createFileRoute('/feedback')({ component: FeedbackRoute })

const SUPPORT_EMAIL_HREF = 'mailto:support@ihsaanly.app'

interface Thing {
  kind: FeedbackKind
  message: string
  contactEmail: string
  /** The account email has been offered once; after that the field is the user's. */
  prefilled: boolean
  includeDiagnostics: boolean
  /** Built when first included, then shown and sent as is. */
  diagnostics: FeedbackDiagnostics | null
  previewShown: boolean
}

const version = (): string => chrome.runtime.getManifest().version

function permission(): Promise<PermissionStatus> {
  return new Promise((resolve) =>
    chrome.notifications.getPermissionLevel((level) =>
      resolve(level === 'granted' ? 'granted' : 'denied'),
    ),
  )
}

/** The popup's own app details, and its reminders: Chrome's permission and the alarms queued. */
async function gatherDiagnostics(): Promise<FeedbackDiagnostics> {
  const alarms = await chrome.alarms.getAll()
  return buildFeedbackDiagnostics(
    { version: version(), platform: 'extension', osVersion: navigator.userAgent, device: 'Chrome' },
    {
      permission: await permission(),
      pending: alarms
        .filter((alarm) => alarm.name !== BADGE_ALARM)
        .map((alarm) => ({ id: alarm.name, at: new Date(alarm.scheduledTime).toISOString() })),
    },
  )
}

function FeedbackRoute(): ReactElement {
  const strings = useExtensionStrings()
  const router = useRouter()
  const navigate = useNavigate()
  const account = useAccount().account
  const feedback = useFeedback()
  const locale = useLocale()
  const [thing, setThing] = useState<Thing>({
    kind: 'bug',
    message: '',
    contactEmail: '',
    prefilled: false,
    includeDiagnostics: false,
    diagnostics: null,
    previewShown: false,
  })

  const email = account?.email ?? null
  useEffect(() => {
    if (email !== null)
      setThing((current) =>
        current.prefilled ? current : { ...current, contactEmail: email, prefilled: true },
      )
  }, [email])

  const wanted = thing.includeDiagnostics && thing.diagnostics === null
  useEffect(() => {
    if (!wanted) return
    let cancelled = false
    void gatherDiagnostics().then((diagnostics) => {
      if (!cancelled) setThing((current) => ({ ...current, diagnostics }))
    })
    return (): void => {
      cancelled = true
    }
  }, [wanted])

  // A finished or failed send is this visit's news; the next visit starts blank.
  useEffect(() => dismissFeedbackStatus, [])

  const send = async (): Promise<void> => {
    const diagnostics = thing.includeDiagnostics
      ? (thing.diagnostics ?? (await gatherDiagnostics()))
      : null
    await sendFeedback({
      kind: thing.kind,
      message: thing.message,
      contactEmail: thing.contactEmail,
      app: { surface: 'extension', version: version(), locale, os: navigator.userAgent },
      diagnostics,
    })
  }

  return (
    <>
      <PageHeader title={strings.feedback.title} />
      <FeedbackScreen
        signedIn={account !== null}
        accountEmail={email}
        kind={thing.kind}
        onKind={(kind) => setThing((current) => ({ ...current, kind }))}
        message={thing.message}
        onMessage={(message) => setThing((current) => ({ ...current, message }))}
        contactEmail={thing.contactEmail}
        onContactEmail={(contactEmail) => setThing((current) => ({ ...current, contactEmail }))}
        includeDiagnostics={thing.includeDiagnostics}
        onIncludeDiagnostics={(includeDiagnostics) =>
          setThing((current) => ({ ...current, includeDiagnostics }))
        }
        diagnosticsPreview={
          thing.diagnostics === null ? null : JSON.stringify(thing.diagnostics, null, 2)
        }
        previewShown={thing.previewShown}
        onTogglePreview={() =>
          setThing((current) => ({ ...current, previewShown: !current.previewShown }))
        }
        status={feedback.status}
        errorCode={feedback.error}
        onSend={() => void send()}
        onRetry={() => void retryFeedback()}
        onSignIn={() => void navigate({ to: '/account' })}
        onDone={() => {
          dismissFeedbackStatus()
          router.history.back()
        }}
        onSendAnother={() => {
          dismissFeedbackStatus()
          setThing((current) => ({
            ...current,
            kind: 'bug',
            message: '',
            includeDiagnostics: false,
            previewShown: false,
          }))
        }}
        supportEmailHref={SUPPORT_EMAIL_HREF}
        privacyHref={LEGAL.privacyUrl}
        onOpenLink={LEGAL.onOpen}
      />
    </>
  )
}
