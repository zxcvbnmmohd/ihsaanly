import type { QuietHours } from './notification-preferences'

function localHour(at: Date, timeZone: string): number {
  const part = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(at)
    .find((candidate) => candidate.type === 'hour')

  if (!part) throw new Error('Formatted time is missing its hour')
  return Number(part.value) % 24
}

/** A period that wraps past midnight is the normal case, not the exception. */
export function isQuiet(at: Date, timeZone: string, quiet: QuietHours | null): boolean {
  if (!quiet) return false
  if (quiet.from === quiet.to) return false

  const hour = localHour(at, timeZone)

  return quiet.from < quiet.to
    ? hour >= quiet.from && hour < quiet.to
    : hour >= quiet.from || hour < quiet.to
}
