import { collection, doc, type Firestore, serverTimestamp, writeBatch } from 'firebase/firestore'
import { type FeedbackDraft, FeedbackRateLimitedError, type FeedbackService } from '../ports'

/**
 * feedback/{autoId}        { uid, kind, message, contactEmail, app, diagnostics, createdAt, status: 'new' }
 * feedbackLimits/{uid}     { lastAt }
 *
 * Top-level, not under users/{uid}, so erasing an account leaves feedback in
 * place (kept up to 2 years, as the privacy policy says). Clients can only
 * create it; the admin reads it in the Firebase console.
 */
export const FEEDBACK_COLLECTION = 'feedback'
export const FEEDBACK_LIMITS_COLLECTION = 'feedbackLimits'

export function feedbackDoc(uid: string, draft: FeedbackDraft): Record<string, unknown> {
  return {
    uid,
    kind: draft.kind,
    message: draft.message,
    contactEmail: draft.contactEmail,
    app: draft.app,
    diagnostics: draft.diagnostics,
    createdAt: serverTimestamp(),
    status: 'new',
  }
}

function codeOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}

export function createFirestoreFeedback(db: Firestore): FeedbackService {
  return {
    send: async (uid, draft) => {
      // The limit doc rides in the same batch: the rules read it with getAfter
      // and compare it with the previous one, which is the whole rate limit.
      const batch = writeBatch(db)
      batch.set(doc(collection(db, FEEDBACK_COLLECTION)), feedbackDoc(uid, draft))
      batch.set(doc(db, FEEDBACK_LIMITS_COLLECTION, uid), { lastAt: serverTimestamp() })
      try {
        await batch.commit()
      } catch (error) {
        // Clients may read neither collection, so there is nothing to check
        // first. For a signed-in owner sending a draft that passed the state
        // layer's checks, the only denial left is the one-minute window; any
        // other denial is a shape bug, which the rules tests exist to catch.
        if (codeOf(error) === 'permission-denied') throw new FeedbackRateLimitedError()
        throw error
      }
    },
  }
}
