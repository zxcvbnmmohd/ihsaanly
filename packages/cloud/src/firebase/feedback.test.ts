import { beforeEach, describe, expect, test } from 'bun:test'
import { Timestamp } from 'firebase/firestore'
import { fake, resetFakes } from '../../test/firebase-fakes'
import { type FeedbackDraft, FeedbackRateLimitedError } from '../ports'

const { createFirestoreFeedback } = await import('./feedback')

const db = { kind: 'db' } as never
const draft: FeedbackDraft = {
  kind: 'bug',
  message: 'The Asr window is an hour out',
  contactEmail: null,
  app: { surface: 'web', version: '1.0.0', locale: 'en', os: 'macOS' },
  diagnostics: null,
}

beforeEach(resetFakes)

describe('createFirestoreFeedback', () => {
  test('writes the feedback doc and the limit doc in one batch', async () => {
    await createFirestoreFeedback(db).send('u1', draft)

    expect(fake.batches).toEqual([2])
    const stored = fake.docs.get('feedback/auto-1')
    expect(stored).toMatchObject({ uid: 'u1', ...draft, status: 'new' })
    expect(Object.keys(stored ?? {}).sort()).toEqual([
      'app',
      'contactEmail',
      'createdAt',
      'diagnostics',
      'kind',
      'message',
      'status',
      'uid',
    ])
    expect(stored?.createdAt).toBeInstanceOf(Timestamp)
    expect(fake.docs.get('feedbackLimits/u1')?.lastAt).toEqual(stored?.createdAt)
    // Nothing is read: the rules allow no reads of either collection.
    expect(fake.reads).toEqual([])
  })

  test('each send is a new document', async () => {
    const feedback = createFirestoreFeedback(db)
    await feedback.send('u1', draft)
    await feedback.send('u1', { ...draft, kind: 'idea' })
    expect(fake.docs.get('feedback/auto-2')).toMatchObject({ kind: 'idea' })
  })

  test('a permission denial is the rate limit', async () => {
    fake.failures.set('commit', Object.assign(new Error('denied'), { code: 'permission-denied' }))
    await expect(createFirestoreFeedback(db).send('u1', draft)).rejects.toBeInstanceOf(
      FeedbackRateLimitedError,
    )
  })

  test('anything else is passed through as it came', async () => {
    const offline = Object.assign(new Error('offline'), { code: 'unavailable' })
    fake.failures.set('commit', offline)
    await expect(createFirestoreFeedback(db).send('u1', draft)).rejects.toBe(offline)
    fake.failures.set('commit', 'plain')
    await expect(createFirestoreFeedback(db).send('u1', draft)).rejects.toBe('plain')
  })
})
