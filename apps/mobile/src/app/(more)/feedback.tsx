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
import { router, useLocalSearchParams } from 'expo-router'
import { type ReactElement, useEffect, useState } from 'react'
import { Linking, Platform } from 'react-native'
import { LEGAL_URLS } from '@/cloud'
import { diagnosticsApp, diagnosticsReminders } from '@/data/export'

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

async function gatherDiagnostics(): Promise<FeedbackDiagnostics> {
  return buildFeedbackDiagnostics(diagnosticsApp(), await diagnosticsReminders())
}

/** `?diagnostics=1` comes from the Diagnostics screen's "Report this problem". */
export default function FeedbackRoute(): ReactElement {
  const { diagnostics: fromDiagnostics } = useLocalSearchParams<{ diagnostics?: string }>()
  const account = useAccount().account
  const feedback = useFeedback()
  const locale = useLocale()
  const [thing, setThing] = useState<Thing>({
    kind: 'bug',
    message: '',
    contactEmail: '',
    prefilled: false,
    includeDiagnostics: fromDiagnostics === '1',
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
      app: {
        surface: Platform.OS === 'ios' ? 'ios' : 'android',
        version: diagnosticsApp().version,
        locale,
        os: `${Platform.OS} ${String(Platform.Version)}`,
      },
      diagnostics,
    })
  }

  return (
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
      onSignIn={() => router.push('/account')}
      onDone={() => {
        dismissFeedbackStatus()
        router.back()
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
      privacyHref={LEGAL_URLS.privacy}
      onOpenLink={(url) => void Linking.openURL(url)}
    />
  )
}
