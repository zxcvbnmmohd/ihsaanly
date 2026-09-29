// The toolbar badge: time to the next prayer. The popup works out the prayer
// times (it has the place and calculation settings); the worker only formats.

/** One prayer's start, with its name already in the user's language. */
export interface BadgePrayer {
  name: string
  at: number
}

export interface Badge {
  text: string
  title: string
}

const MINUTE = 60_000

/** "42m" under an hour, "3h" above; chrome shows about four characters. */
export function badgeFor(prayers: BadgePrayer[], now: number, locale: string): Badge | null {
  const next = prayers.find((prayer) => prayer.at > now)
  if (!next) return null
  const minutes = Math.ceil((next.at - now) / MINUTE)
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    next.at,
  )
  return {
    text: minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`,
    title: `${next.name} · ${time}`,
  }
}
