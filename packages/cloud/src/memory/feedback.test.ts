import { describe, expect, test } from 'bun:test'
import { type FeedbackDraft, FeedbackRateLimitedError } from '../ports'
import { createMemoryFeedback } from './feedback'

const draft: FeedbackDraft = {
  kind: 'idea',
  message: 'A Hijri widget',
  contactEmail: 'me@example.test',
  app: { surface: 'ios', version: '1.0.0', locale: 'en', os: 'iOS 18' },
  diagnostics: null,
}

describe('createMemoryFeedback', () => {
  test('keeps what was sent, stamped like the rules require', async () => {
    const feedback = createMemoryFeedback({ now: () => 5 })
    await feedback.send('u1', draft)
    expect(feedback.sent).toEqual([{ ...draft, uid: 'u1', createdAt: 5, status: 'new' }])
  })

  test('refuses a second send within a minute, per account, and allows it after', async () => {
    let now = 0
    const feedback = createMemoryFeedback({ now: () => now })
    await feedback.send('u1', draft)
    now = 59_999
    await expect(feedback.send('u1', draft)).rejects.toBeInstanceOf(FeedbackRateLimitedError)
    await feedback.send('u2', draft)
    now = 60_000
    await feedback.send('u1', draft)
    expect(feedback.sent.map((each) => each.uid)).toEqual(['u1', 'u2', 'u1'])
  })

  test('the clock defaults to Date.now', async () => {
    const feedback = createMemoryFeedback()
    await feedback.send('u1', draft)
    await expect(feedback.send('u1', draft)).rejects.toBeInstanceOf(FeedbackRateLimitedError)
  })
})
