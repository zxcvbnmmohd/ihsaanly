import {
  FEEDBACK_INTERVAL_MS,
  type FeedbackDraft,
  FeedbackRateLimitedError,
  type FeedbackService,
} from '../ports'

export interface SentFeedback extends FeedbackDraft {
  uid: string
  createdAt: number
  status: 'new'
}

export interface MemoryFeedback extends FeedbackService {
  /** Everything accepted, oldest first. */
  sent: SentFeedback[]
}

/**
 * A fake FeedbackService with the rules' one behaviour that matters to
 * callers: a second send from the same account inside a minute is refused.
 */
export function createMemoryFeedback(options: { now?: () => number } = {}): MemoryFeedback {
  const now = options.now ?? Date.now
  const lastAt = new Map<string, number>()
  const sent: SentFeedback[] = []

  return {
    sent,
    send: async (uid, draft) => {
      const at = now()
      const previous = lastAt.get(uid)
      if (previous !== undefined && at - previous < FEEDBACK_INTERVAL_MS)
        throw new FeedbackRateLimitedError()
      lastAt.set(uid, at)
      sent.push({ ...draft, uid, createdAt: at, status: 'new' })
    },
  }
}
