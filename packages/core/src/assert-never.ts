/**
 * Exhaustiveness check for unions. End every `switch` over a union with
 * `default: return assertNever(value)` — adding a trigger kind or a window
 * name then fails the build at every place that must handle it, rather than
 * silently falling through.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
