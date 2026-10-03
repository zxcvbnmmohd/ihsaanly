import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback, type MemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud, FeedbackDraft, FeedbackService } from '@ihsaanly/cloud/ports'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('../storage/backend')
const { recentFailures } = await import('../storage/log')
const { createLocalStore } = await import('../cloud/local-store')
const { buildExport } = await import('../data/export')
const session = await import('../cloud/session')
const outbox = await import('./outbox')
const feedback = await import('./store')

const settle = (ms = 30): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const draft = (overrides: Partial<FeedbackDraft> = {}): FeedbackDraft => ({
  kind: 'bug',
  message: 'The Asr window is an hour out',
  contactEmail: null,
  app: { surface: 'web', version: '1.0.0', locale: 'en', os: 'macOS' },
  diagnostics: null,
  ...overrides,
})

const failing = (message: string, code?: string): Error =>
  Object.assign(new Error(message), code === undefined ? {} : { code })

describe('feedback', () => {
  let now = 0
  let sent: MemoryFeedback
  let cloud: Cloud
  let stop: () => void = () => {}

  const start = (load: () => Promise<Cloud> = async () => cloud): void => {
    stop = session.startCloud(load, { debounceMs: 5 })
  }
  const signedIn = async (): Promise<void> => {
    start()
    await session.signIn('apple')
    await session.flushFeedback()
  }

  afterAll(() => stop())

  beforeEach(() => {
    stop()
    resetStorage()
    outbox.resetFeedbackState()
    now = 0
    sent = createMemoryFeedback({ now: () => now })
    cloud = {
      auth: createMemoryAuth({ uid: 'me' }),
      remote: createMemorySyncRemote(),
      feedback: sent,
    }
  })

  describe('signed out', () => {
    it('queues the report, sends nothing, and sends it once signed in', async () => {
      await feedback.sendFeedback(draft())

      expect(feedback.getFeedbackState()).toEqual({
        status: 'queued',
        error: 'signed-out',
        pending: 1,
      })
      expect(outbox.readOutbox()[0]?.uid).toBeNull()
      expect(sent.sent).toEqual([])

      await signedIn()

      expect(sent.sent.map((each) => [each.uid, each.message])).toEqual([
        ['me', 'The Asr window is an hour out'],
      ])
      expect(feedback.getFeedbackState()).toEqual({ status: 'sent', error: null, pending: 0 })
    })

    it('retrying does nothing while signed out', async () => {
      await feedback.sendFeedback(draft())
      await feedback.retryFeedback()
      expect(feedback.getFeedbackState().status).toBe('queued')
    })
  })

  describe('signed in', () => {
    it('sends straight away and empties the outbox', async () => {
      await signedIn()
      await feedback.sendFeedback(draft({ contactEmail: '  me@example.test ' }))

      expect(sent.sent).toHaveLength(1)
      expect(sent.sent[0]).toMatchObject({ uid: 'me', contactEmail: 'me@example.test' })
      expect(outbox.readOutbox()).toEqual([])
      expect(feedback.getFeedbackState()).toEqual({ status: 'sent', error: null, pending: 0 })
    })

    it('keeps a rate-limited report queued and sends it on the next foreground', async () => {
      await signedIn()
      await feedback.sendFeedback(draft())
      now = 30_000
      await feedback.sendFeedback(draft({ kind: 'idea' }))

      expect(feedback.getFeedbackState()).toEqual({
        status: 'error',
        error: 'rate-limited',
        pending: 1,
      })
      // Expected, not a failure worth logging.
      expect(recentFailures().some((entry) => entry.label === 'feedbackSend')).toBe(false)

      now = 61_000
      session.notifyForeground()
      await session.flushFeedback()

      expect(sent.sent.map((each) => each.kind)).toEqual(['bug', 'idea'])
      expect(feedback.getFeedbackState()).toEqual({ status: 'sent', error: null, pending: 0 })
    })

    it('keeps it queued while offline, logs why, and sends it on retry', async () => {
      await signedIn()
      const send = sent.send
      cloud.feedback.send = async () => {
        throw failing('offline', 'unavailable')
      }
      await feedback.sendFeedback(draft())

      expect(feedback.getFeedbackState()).toEqual({
        status: 'queued',
        error: 'network',
        pending: 1,
      })
      expect(recentFailures().at(-1)?.label).toBe('feedbackSend')

      cloud.feedback.send = send
      await feedback.retryFeedback()
      expect(sent.sent).toHaveLength(1)
      expect(feedback.getFeedbackState().status).toBe('sent')
    })

    it('keeps it queued after an unknown failure', async () => {
      await signedIn()
      cloud.feedback.send = async () => {
        throw failing('boom')
      }
      await feedback.sendFeedback(draft())
      expect(feedback.getFeedbackState()).toEqual({ status: 'error', error: 'unknown', pending: 1 })
    })

    it('stops at the first failure and keeps the rest in order', async () => {
      outbox.enqueue(draft({ message: 'one' }), 'me')
      outbox.enqueue(draft({ message: 'two' }), 'me')
      start()
      await session.signIn('apple')
      await session.flushFeedback()

      expect(sent.sent.map((each) => each.message)).toEqual(['one'])
      expect(outbox.readOutbox().map((entry) => entry.draft.message)).toEqual(['two'])
      expect(feedback.getFeedbackState().error).toBe('rate-limited')
    })

    it("never sends another account's report", async () => {
      outbox.enqueue(draft({ message: 'theirs' }), 'someone-else')
      await signedIn()

      expect(sent.sent).toEqual([])
      expect(outbox.readOutbox()).toHaveLength(1)
      expect(feedback.getFeedbackState().status).toBe('idle')
    })

    it('runs one flush at a time, folding a request mid-flush into one more', async () => {
      await signedIn()
      let sends = 0
      const slow: FeedbackService = {
        send: async (uid, each) => {
          sends += 1
          await settle(10)
          await sent.send(uid, each)
          now += 60_000
        },
      }
      cloud.feedback = slow
      outbox.enqueue(draft({ message: 'one' }), 'me')
      const first = session.flushFeedback()
      outbox.enqueue(draft({ message: 'two' }), 'me')
      await Promise.all([first, session.flushFeedback(), session.flushFeedback()])

      expect(sends).toBe(2)
      expect(sent.sent.map((each) => each.message)).toEqual(['one', 'two'])
    })
  })

  describe('a restored session', () => {
    it('sends what an earlier launch left queued', async () => {
      outbox.enqueue(draft({ message: 'from last time' }), 'me')
      await cloud.auth.signIn('apple')
      backend.writePreferenceRow('account', '{"signedIn":true}')
      start()
      await settle()
      await session.flushFeedback()

      expect(sent.sent.map((each) => each.message)).toEqual(['from last time'])
    })

    it('keeps the report when the cloud cannot be reached', async () => {
      outbox.enqueue(draft(), 'me')
      await signedIn()
      expect(sent.sent).toHaveLength(1)

      outbox.enqueue(draft(), 'me')
      await outbox.flushOutbox(async () => {
        throw failing('Failed to fetch')
      }, 'me')
      expect(feedback.getFeedbackState()).toEqual({
        status: 'queued',
        error: 'network',
        pending: 1,
      })
    })
  })

  describe('drafts', () => {
    it('refuses an empty or oversize message and an oversize email, queueing nothing', async () => {
      await feedback.sendFeedback(draft({ message: '   ' }))
      expect(feedback.getFeedbackState()).toEqual({ status: 'error', error: 'invalid', pending: 0 })
      await feedback.sendFeedback(draft({ message: 'x'.repeat(5001) }))
      await feedback.sendFeedback(draft({ contactEmail: `${'x'.repeat(250)}@a.bc` }))
      expect(outbox.readOutbox()).toEqual([])
    })

    it('trims the message, blanks an empty email and clips long app fields', () => {
      expect(
        feedback.normalizeDraft(
          draft({
            message: '  hi  ',
            contactEmail: '  ',
            app: {
              surface: 'ios',
              version: 'v'.repeat(70),
              locale: 'l'.repeat(40),
              os: 'o'.repeat(70),
            },
          }),
        ),
      ).toEqual(
        draft({
          message: 'hi',
          contactEmail: null,
          app: {
            surface: 'ios',
            version: 'v'.repeat(64),
            locale: 'l'.repeat(35),
            os: 'o'.repeat(64),
          },
        }),
      )
    })
  })

  describe('the outbox', () => {
    it('holds at most ten, dropping the oldest', () => {
      for (let i = 0; i < 12; i++) outbox.enqueue(draft({ message: `m${i}` }), 'me', i)
      const kept = outbox.readOutbox()
      expect(kept).toHaveLength(outbox.OUTBOX_CAPACITY)
      expect(kept[0]?.draft.message).toBe('m2')
    })

    it('reads an unreadable row as empty', () => {
      backend.writePreferenceRow('feedbackOutbox', '{"nope')
      expect(outbox.readOutbox()).toEqual([])
      backend.writePreferenceRow('feedbackOutbox', JSON.stringify([{ id: 1 }]))
      expect(outbox.readOutbox()).toEqual([])
    })

    it('keeps diagnostics as given, and refuses ones that are not an object', () => {
      const diagnostics = { locale: 'en' } as unknown as FeedbackDraft['diagnostics']
      outbox.enqueue(draft({ diagnostics }), 'me')
      expect(outbox.readOutbox()[0]?.draft.diagnostics).toEqual(diagnostics)
      backend.writePreferenceRow(
        'feedbackOutbox',
        JSON.stringify([{ ...outbox.readOutbox()[0], draft: { ...draft(), diagnostics: [1] } }]),
      )
      expect(outbox.readOutbox()).toEqual([])
    })

    it('never syncs and never goes into an export', () => {
      outbox.enqueue(draft(), 'me')
      expect(
        createLocalStore()
          .preferences()
          .map((p) => p.key),
      ).not.toContain('feedbackOutbox')
      expect(buildExport().preferences).not.toHaveProperty('feedbackOutbox')
    })

    it('is wiped with the rest when signing out and removing data', async () => {
      await signedIn()
      cloud.feedback.send = async () => {
        throw failing('offline', 'unavailable')
      }
      await feedback.sendFeedback(draft())
      expect(feedback.getFeedbackState().pending).toBe(1)

      await session.signOut('remove')
      expect(feedback.getFeedbackState()).toEqual({ status: 'idle', error: null, pending: 0 })
    })
  })

  describe('useFeedback', () => {
    it('re-renders on every change, and dismissing goes back to idle', async () => {
      const { result } = renderHook(() => feedback.useFeedback())
      expect(result.current.status).toBe('idle')

      await act(() => feedback.sendFeedback(draft()))
      expect(result.current).toEqual({ status: 'queued', error: 'signed-out', pending: 1 })

      act(() => feedback.dismissFeedbackStatus())
      expect(result.current).toEqual({ status: 'idle', error: null, pending: 1 })
    })
  })
})
