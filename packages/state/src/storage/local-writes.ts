/**
 * Something the user did on this device just reached storage. Cloud sync
 * listens so it can push soon after; nothing else needs it. Writes that arrive
 * *from* sync go straight to the backend and never pass through here, so
 * applying a pull does not schedule another push of the same thing.
 */
type Listener = (preferenceKey: string | null) => void

const listeners = new Set<Listener>()

/** `preferenceKey` is the key written, or null for the event log. */
export function onLocalWrite(listener: Listener): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

/**
 * Never lets a listener's failure reach the write that triggered it: local
 * storage must keep working whatever sync is doing.
 */
export function noteLocalWrite(preferenceKey: string | null): void {
  listeners.forEach((listener) => {
    try {
      listener(preferenceKey)
    } catch {
      // A listener's problem, not the write's.
    }
  })
}
