/** Long enough to recognise an error, too short to carry a payload. */
export const CRASH_MESSAGE_LIMIT = 200

/**
 * A failure message as it may leave the device: emails, URL queries and
 * fragments, and long numbers (coordinates, ids, phone numbers) masked, then
 * clipped. Messages come from anything that throws, so none is trusted.
 */
export function redactMessage(message: string): string {
  const masked = message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '<email>')
    .replace(/(\b[a-z][a-z\d+.-]*:\/\/[^\s?#]*)[?#]\S*/gi, '$1?<redacted>')
    .replace(/-?\d+(?:[.,]\d+)?(?:\s*,\s*-?\d+(?:[.,]\d+)?)?/g, (run) =>
      run.replace(/\D/g, '').length >= 5 ? '<number>' : run,
    )
  return masked.length > CRASH_MESSAGE_LIMIT ? `${masked.slice(0, CRASH_MESSAGE_LIMIT)}…` : masked
}
