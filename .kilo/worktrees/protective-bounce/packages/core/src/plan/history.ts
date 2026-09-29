export interface LoggedAction {
  kind: string
  subject: string
  at: number
  logDay: string
  deltaSeconds: number | null
}

export interface ActionSummary {
  subject: string
  count: number
  /** Median offset from the middle of its window. Negative is early. */
  typicalOffsetSeconds: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  if (upper === undefined) return null
  return sorted.length % 2 === 0 && lower !== undefined ? (lower + upper) / 2 : upper
}

/**
 * Reflective, not a score. There is no total, no percentage and nothing to
 * compare against — only what was done and roughly when.
 */
export function summarise(actions: LoggedAction[], kind: string): ActionSummary[] {
  const grouped = new Map<string, LoggedAction[]>()

  actions
    .filter((action) => action.kind === kind)
    .forEach((action) => {
      const existing = grouped.get(action.subject)
      if (existing) existing.push(action)
      else grouped.set(action.subject, [action])
    })

  return [...grouped.entries()]
    .map(([subject, entries]) => ({
      subject,
      count: entries.length,
      typicalOffsetSeconds: median(
        entries
          .map((entry) => entry.deltaSeconds)
          .filter((offset): offset is number => offset !== null),
      ),
    }))
    .sort((left, right) => right.count - left.count)
}

/**
 * An `off` fact retracts the latest un-retracted `on` for the same subject on
 * the same day, so an unmarked prayer or an undone item is not counted.
 */
export function withoutRetracted(
  actions: LoggedAction[],
  pairs: [on: string, off: string][],
): LoggedAction[] {
  const retracted = new Set<LoggedAction>()
  const openBy = new Map<string, LoggedAction[]>()

  actions.forEach((action) => {
    pairs.forEach(([on, off]) => {
      const key = `${on}|${action.subject}|${action.logDay}`
      if (action.kind === on) {
        openBy.set(key, [...(openBy.get(key) ?? []), action])
      } else if (action.kind === off) {
        const open = openBy.get(key) ?? []
        const latest = open.pop()
        if (latest) retracted.add(latest)
        retracted.add(action)
      }
    })
  })

  return actions.filter((action) => !retracted.has(action))
}

export function daysActive(actions: LoggedAction[]): number {
  return new Set(actions.map((action) => action.logDay)).size
}
