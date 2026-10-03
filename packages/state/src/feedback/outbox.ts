// Feedback waits here until the server accepts it: written offline, signed
// out, or inside the one-minute window, it is kept and sent on the next
// trigger (sign-in, restore, foreground, or the screen's retry). The session
// drives the flushes; this module owns the queue and the status the screen
// reads, and never imports the session, so the session can import it.
import {
  type FeedbackDiagnostics,
  type FeedbackDraft,
  FeedbackRateLimitedError,
  type FeedbackService,
} from '@ihsaanly/cloud/ports'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'

import { codeOf, isNetworkError } from '../cloud/errors'
import { FEEDBACK_OUTBOX_KEY } from '../cloud/keys'
import { writePreferenceRow } from '../storage/backend'
import { noteFailure } from '../storage/events'
import { readPreference } from '../storage/preferences'

export type FeedbackStatus = 'idle' | 'sending' | 'queued' | 'sent' | 'error'

/**
 * Why the last send did not go, as a code the screen turns into its own
 * sentence (like `AccountErrorCode`). With `queued`: `network` (it goes when
 * back online) or `signed-out` (it goes after signing in). With `error`:
 * `rate-limited` (still queued; try again in a minute), `invalid` (nothing
 * queued: empty or too long), or `unknown` (still queued).
 */
export type FeedbackErrorCode = 'rate-limited' | 'network' | 'signed-out' | 'invalid' | 'unknown'

export interface FeedbackState {
  status: FeedbackStatus
  error: FeedbackErrorCode | null
  /** How many are waiting on this device. */
  pending: number
}

/** Ten unsent reports is already a lot; past that, the oldest give way. */
export const OUTBOX_CAPACITY = 10

const Entry = z.object({
  id: z.string(),
  /** Who wrote it. Only that account sends it; null means whoever signs in. */
  uid: z.string().nullable(),
  queuedAt: z.number(),
  draft: z.object({
    kind: z.enum(['bug', 'idea', 'other']),
    message: z.string(),
    contactEmail: z.string().nullable(),
    app: z.object({
      surface: z.enum(['ios', 'android', 'web', 'extension']),
      version: z.string(),
      locale: z.string(),
      os: z.string(),
    }),
    // Built by buildFeedbackDiagnostics and only ever read back from here.
    diagnostics: z
      .custom<FeedbackDiagnostics>(
        (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
      )
      .nullable(),
  }),
})

export type OutboxEntry = z.infer<typeof Entry>

const Outbox = z.array(Entry)

export function readOutbox(): OutboxEntry[] {
  return readPreference(FEEDBACK_OUTBOX_KEY, Outbox) ?? []
}

/** Straight to the backend: device bookkeeping, never a change worth syncing. */
function writeOutbox(entries: OutboxEntry[]): void {
  writePreferenceRow(FEEDBACK_OUTBOX_KEY, JSON.stringify(entries))
}

export function enqueue(draft: FeedbackDraft, uid: string | null, now = Date.now()): OutboxEntry {
  const entry: OutboxEntry = {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    uid,
    queuedAt: now,
    draft,
  }
  writeOutbox([...readOutbox(), entry].slice(-OUTBOX_CAPACITY))
  return entry
}

function remove(id: string): void {
  writeOutbox(readOutbox().filter((entry) => entry.id !== id))
}

// --- status ---------------------------------------------------------------

const IDLE: FeedbackState = { status: 'idle', error: null, pending: 0 }

let state: FeedbackState = IDLE
let cached: FeedbackState | null = null
const listeners = new Set<() => void>()

export function setFeedbackState(next: Pick<FeedbackState, 'status' | 'error'>): void {
  state = { ...next, pending: readOutbox().length }
  cached = state
  listeners.forEach((listener) => listener())
}

/** After a wipe, or when the screen is left: nothing to report. */
export function resetFeedbackState(): void {
  setFeedbackState({ status: 'idle', error: null })
}

export function getFeedbackState(): FeedbackState {
  // The first read after launch counts what an earlier session left queued.
  cached ??= { ...state, pending: readOutbox().length }
  return cached
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

export function useFeedback(): FeedbackState {
  return useSyncExternalStore(subscribe, getFeedbackState)
}

// --- sending --------------------------------------------------------------

function failed(error: unknown): Pick<FeedbackState, 'status' | 'error'> {
  if (error instanceof FeedbackRateLimitedError || codeOf(error) === 'rate-limited')
    return { status: 'error', error: 'rate-limited' }
  noteFailure('feedbackSend', error)
  if (isNetworkError(error)) return { status: 'queued', error: 'network' }
  return { status: 'error', error: 'unknown' }
}

async function drain(service: () => Promise<FeedbackService>, uid: string): Promise<void> {
  const next = (): OutboxEntry | undefined =>
    readOutbox().find((entry) => entry.uid === uid || entry.uid === null)
  if (!next()) return

  setFeedbackState({ status: 'sending', error: null })
  try {
    const feedback = await service()
    // Oldest first, one at a time, re-reading each time so a report added
    // mid-flush goes too. The first failure stops the rest: each one after a
    // rate limit would only be refused as well.
    for (let entry = next(); entry; entry = next()) {
      await feedback.send(uid, entry.draft)
      remove(entry.id)
    }
    setFeedbackState({ status: 'sent', error: null })
  } catch (error) {
    setFeedbackState(failed(error))
  }
}

let flushing: Promise<void> | null = null
let again: { service: () => Promise<FeedbackService>; uid: string } | null = null

/**
 * Sends `uid`'s queued feedback (and any written signed out), keeping each one
 * until the server accepts it. One flush at a time; a request mid-flush runs
 * once more afterwards.
 */
export function flushOutbox(service: () => Promise<FeedbackService>, uid: string): Promise<void> {
  if (flushing !== null) {
    again = { service, uid }
    return flushing
  }
  flushing = (async (): Promise<void> => {
    let request: typeof again = { service, uid }
    while (request) {
      again = null
      await drain(request.service, request.uid)
      request = again
    }
  })().finally(() => {
    flushing = null
  })
  return flushing
}
