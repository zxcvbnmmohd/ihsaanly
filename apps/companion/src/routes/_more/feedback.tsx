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
import { useStrings } from '@ihsaanly/state/strings'
import { FeedbackScreen } from '@ihsaanly/ui/screens/feedback'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { z } from 'zod'
import { PageHeader } from '~/components/page-header'
import { DIAGNOSTICS_REMINDERS, diagnosticsApp } from '~/data/export'
import { openUrl } from '~/platform/open-url'

/** `?diagnostics=1`: from the Diagnostics screen's "Report this problem", with the report attached. */
const feedbackSearch = z.object({ diagnostics: z.literal(1).optional().catch(undefined) })

export const Route = createFileRoute('/_more/feedback')({
  validateSearch: feedbackSearch,
  component: FeedbackRoute,
})

const SUPPORT_EMAIL_HREF = 'mailto:support@ihsaanly.app'
const PRIVACY_URL = 'https://ihsaanly.app/legal/privacy'

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

const gatherDiagnostics = (): FeedbackDiagnostics =>
  buildFeedbackDiagnostics(diagnosticsApp(), DIAGNOSTICS_REMINDERS)

function FeedbackRoute(): ReactElement {
  const strings = useStrings()
  const router = useRouter()
  const navigate = useNavigate()
  const fromDiagnostics = Route.useSearch().diagnostics === 1
  const account = useAccount().account
  const feedback = useFeedback()
  const locale = useLocale()
  const [thing, setThing] = useState<Thing>(() => ({
    kind: 'bug',
    message: '',
    contactEmail: '',
    prefilled: false,
    includeDiagnostics: fromDiagnostics,
    diagnostics: fromDiagnostics ? gatherDiagnostics() : null,
    previewShown: false,
  }))

  const email = account?.email ?? null
  useEffect(() => {
    if (email !== null)
      setThing((current) =>
        current.prefilled ? current : { ...current, contactEmail: email, prefilled: true },
      )
  }, [email])

  // A finished or failed send is this visit's news; the next visit starts blank.
  useEffect(() => dismissFeedbackStatus, [])

  const send = (): void => {
    // Built synchronously when switched on, so this is exactly what the preview shows.
    const diagnostics = thing.includeDiagnostics ? thing.diagnostics : null
    void sendFeedback({
      kind: thing.kind,
      message: thing.message,
      contactEmail: thing.contactEmail,
      app: { surface: 'web', version: diagnosticsApp().version, locale, os: navigator.userAgent },
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
          setThing((current) => ({
            ...current,
            includeDiagnostics,
            diagnostics: includeDiagnostics
              ? (current.diagnostics ?? gatherDiagnostics())
              : current.diagnostics,
          }))
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
        onSend={send}
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
        privacyHref={PRIVACY_URL}
        onOpenLink={openUrl}
      />
    </>
  )
}
