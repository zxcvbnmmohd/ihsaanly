// Replaces the feedback store's actions and `useFeedback` with recorders and a
// settable status, keeping the rest (diagnostics trimming) real. Like
// session-mock.ts: import it before the code under test, and call
// `resetFeedback()` in a beforeEach.
import { mock } from 'bun:test'
import type { FeedbackDraft } from '@ihsaanly/cloud/ports'
import * as real from '@ihsaanly/state/feedback/store'
import { useSyncExternalStore } from 'react'

type Outcome = Pick<real.FeedbackState, 'status' | 'error'>

export const feedbackCalls: { name: string; args: unknown[] }[] = []
export const sentDrafts: FeedbackDraft[] = []

const IDLE: real.FeedbackState = { status: 'idle', error: null, pending: 0 }
let state = IDLE
/** What the next send or retry ends in. */
let outcome: Outcome = { status: 'sent', error: null }
const listeners = new Set<() => void>()

function publish(next: Outcome): void {
  state = { ...next, pending: next.status === 'sent' ? 0 : 1 }
  for (const listener of listeners) listener()
}

export function resetFeedback(): void {
  feedbackCalls.length = 0
  sentDrafts.length = 0
  outcome = { status: 'sent', error: null }
  state = IDLE
}

export function nextOutcome(next: Outcome): void {
  outcome = next
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

mock.module('@ihsaanly/state/feedback/store', () => ({
  ...real,
  useFeedback: (): real.FeedbackState => useSyncExternalStore(subscribe, () => state),
  sendFeedback: async (draft: FeedbackDraft): Promise<void> => {
    feedbackCalls.push({ name: 'sendFeedback', args: [draft] })
    sentDrafts.push(draft)
    publish(outcome)
  },
  retryFeedback: async (): Promise<void> => {
    feedbackCalls.push({ name: 'retryFeedback', args: [] })
    publish(outcome)
  },
  dismissFeedbackStatus: (): void => {
    feedbackCalls.push({ name: 'dismissFeedbackStatus', args: [] })
    publish({ status: 'idle', error: null })
  },
}))
