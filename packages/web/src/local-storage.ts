// Reads and writes are best-effort: storage can be missing or throw (private
// windows, blocked site data), and every value it holds is a convenience, so
// a failure is simply ignored — mirrors the old site.js readStored/store.
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storeValue(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Not remembered; the choice still applies to this page.
  }
}
