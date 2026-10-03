// What the cloud code needs to know about a thrown value, whatever threw it:
// Firebase errors carry a string `code`, Google Sign-In a numeric one, and
// some SDKs only a message.

export function codeOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown }
    if (typeof code === 'string' || typeof code === 'number') return String(code)
  }
  return ''
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const NETWORK_CODES = new Set(['auth/network-request-failed', 'unavailable', 'deadline-exceeded'])

/** Offline, or the server could not be reached: worth trying again later, as is. */
export function isNetworkError(error: unknown): boolean {
  return (
    NETWORK_CODES.has(codeOf(error)) || /network|failed to fetch|offline/i.test(messageOf(error))
  )
}
