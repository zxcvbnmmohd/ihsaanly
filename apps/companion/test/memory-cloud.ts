// Connects the real cloud session (@ihsaanly/state/cloud/session) to the
// in-memory auth, sync remote and feedback service, the way src/cloud.ts connects it to
// Firebase, so account screens can be driven end to end.
import { createMemoryAuth, type MemoryAuthOptions } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback, type MemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Cloud } from '@ihsaanly/cloud/ports'

export interface MemoryCloud {
  cloud: Cloud
  /** What the feedback service accepted, oldest first. */
  feedback: MemoryFeedback
  /** How many times the session wiped this device. */
  wipes: () => number
  /** Signs out, forgets the session and clears what it remembered. */
  stop: () => Promise<void>
}

export async function connectMemoryCloud(
  options: MemoryAuthOptions & { remote?: Cloud['remote'] } = {},
): Promise<MemoryCloud> {
  const session = await import('@ihsaanly/state/cloud/session')
  const { remote, ...authOptions } = options
  const feedback = createMemoryFeedback()
  const cloud: Cloud = {
    auth: createMemoryAuth(authOptions),
    remote: remote ?? createMemorySyncRemote(),
    feedback,
  }
  let wiped = 0
  const stopSession = session.startCloud(async () => cloud, {
    debounceMs: 5,
    onWiped: () => {
      wiped += 1
    },
  })
  return {
    cloud,
    feedback,
    wipes: () => wiped,
    stop: async () => {
      await session.signOut('keep')
      stopSession()
    },
  }
}
