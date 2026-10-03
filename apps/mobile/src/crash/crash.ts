import { getCrashReports, setCrashReports } from '@ihsaanly/state/opt-ins/store'
import type { FailureEntry } from '@ihsaanly/state/storage/log'
import { onFailure } from '@ihsaanly/state/storage/log'

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics')

/** The seam over Crashlytics, so tests never load the native module. */
export interface CrashReporter {
  /** Collection on or off. Off also drops anything captured but not yet sent. */
  setCollection: (on: boolean, dropCached: boolean) => Promise<void>
  /** One logged failure, as a non-fatal error: its label and message, nothing else. */
  report: (entry: FailureEntry) => void
}

function reporter(module: CrashlyticsModule): CrashReporter {
  const crashlytics = module.getCrashlytics()
  return {
    setCollection: async (on, dropCached) => {
      if (dropCached) await module.deleteUnsentReports(crashlytics)
      await module.setCrashlyticsCollectionEnabled(crashlytics, on)
    },
    report: (entry) => {
      const error = new Error(entry.message)
      error.name = entry.label
      module.recordError(crashlytics, error, entry.label)
    },
  }
}

/** Null where there is no native Crashlytics: Expo Go, or a build from before it. */
export async function loadCrashReporter(
  load: () => Promise<CrashlyticsModule> = () => import('@react-native-firebase/crashlytics'),
): Promise<CrashReporter | null> {
  try {
    return reporter(await load())
  } catch {
    return null
  }
}

let stopForwarding: (() => void) | null = null

/**
 * Collection follows the switch, and while it is on every failure the app
 * already logs for the diagnostic report is also sent as a non-fatal. A user
 * id is never set and nothing about the person's practice or account is
 * attached: a report is the label, the message, the device model and the app
 * version Crashlytics adds itself.
 *
 * `dropCached` deletes reports captured while it was off, so turning it on
 * never sends what happened before the person agreed (Crashlytics keeps
 * reports on the device while collection is off). It is false at launch, where
 * a pending report is the previous session's crash, captured while on.
 */
async function apply(on: boolean, dropCached: boolean): Promise<void> {
  stopForwarding?.()
  stopForwarding = null

  const crash = await loadCrashReporter()
  if (!crash) return

  try {
    await crash.setCollection(on, dropCached)
  } catch {
    // Collection stays as Firebase had it: off unless the person turned it on.
    return
  }
  if (on) {
    // The log already isolates a listener that throws, so a report that fails
    // never becomes another logged failure.
    stopForwarding = onFailure(crash.report)
  }
}

/**
 * At launch: collection as the person left it. Firebase starts with it off
 * (firebase.json), so for someone who never turned it on there is nothing to
 * do and Crashlytics is not touched from JavaScript at all.
 */
export async function startCrashReporting(): Promise<void> {
  if (getCrashReports()) await apply(true, false)
}

/** The "Share crash reports" switch. */
export function setCrashReporting(on: boolean): Promise<void> {
  setCrashReports(on)
  return apply(on, true)
}
