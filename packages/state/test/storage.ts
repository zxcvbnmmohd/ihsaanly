import './native'

// Dynamic: the native modules have to be mocked before `backend.ts` is linked.
const { wipe } = await import('../src/storage/backend')
const { reloadEvents } = await import('../src/storage/events')
const { forgetFailures } = await import('../src/storage/log')
const { reloadPreferences } = await import('../src/storage/preference-store')

/** An empty database and no cached values, whatever an earlier test file left behind. */
export function resetStorage(): void {
  wipe()
  reloadPreferences()
  forgetFailures()
  reloadEvents()
}
