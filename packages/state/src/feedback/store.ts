// The feedback screen's whole API. Sending is offline-first: a report is
// queued on the device first, then sent through the cloud if signed in.
import { FEEDBACK_EMAIL_MAX, FEEDBACK_MESSAGE_MAX, type FeedbackDraft } from '@ihsaanly/cloud/ports'

import { flushFeedback, getAccountState } from '../cloud/session'
import { enqueue, resetFeedbackState, setFeedbackState } from './outbox'

export { buildFeedbackDiagnostics } from './diagnostics'
export type { FeedbackErrorCode, FeedbackState, FeedbackStatus } from './outbox'
export { getFeedbackState, useFeedback } from './outbox'

const clip = (text: string, limit: number): string => text.slice(0, limit)

/**
 * The draft as the rules will accept it, or null when no amount of trimming
 * makes it valid. App fields are clipped rather than refused: a long OS name
 * is no reason to lose a report.
 */
export function normalizeDraft(draft: FeedbackDraft): FeedbackDraft | null {
  const message = draft.message.trim()
  const contactEmail = draft.contactEmail?.trim() || null
  if (message.length === 0 || message.length > FEEDBACK_MESSAGE_MAX) return null
  if (contactEmail !== null && contactEmail.length > FEEDBACK_EMAIL_MAX) return null
  return {
    ...draft,
    message,
    contactEmail,
    app: {
      surface: draft.app.surface,
      version: clip(draft.app.version, 64),
      locale: clip(draft.app.locale, 35),
      os: clip(draft.app.os, 64),
    },
  }
}

/**
 * Queues the report, then sends it if signed in. Never throws: the outcome is
 * in `useFeedback()`. A report the server refuses for now (offline, or inside
 * the one-minute limit) stays queued and goes on a later flush.
 */
export async function sendFeedback(draft: FeedbackDraft): Promise<void> {
  const normalized = normalizeDraft(draft)
  if (!normalized) {
    setFeedbackState({ status: 'error', error: 'invalid' })
    return
  }
  const account = getAccountState().account
  enqueue(normalized, account?.uid ?? null)
  if (!account) {
    setFeedbackState({ status: 'queued', error: 'signed-out' })
    return
  }
  await flushFeedback()
}

/** The screen's "Try again": sends what is queued now. */
export const retryFeedback = flushFeedback

/** Leaving the screen: back to a blank form. Queued reports stay queued. */
export const dismissFeedbackStatus = resetFeedbackState
