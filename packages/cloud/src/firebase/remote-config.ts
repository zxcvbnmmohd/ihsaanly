import type { FirebaseApp } from 'firebase/app'
import { fetchAndActivate, getAll, getRemoteConfig, isSupported } from 'firebase/remote-config'
import type { ZodType } from 'zod'
import type { RemoteConfigService } from '../ports'

/**
 * Remote Config values arrive as strings, so `schema` must coerce them. It is
 * unsupported without IndexedDB (React Native included), where the app simply
 * stays on `defaults`; so does any fetch or parse failure.
 */
export function createFirebaseRemoteConfig<T>(
  app: FirebaseApp,
  schema: ZodType<T>,
  defaults: T,
): RemoteConfigService<T> {
  let current = defaults
  return {
    get: () => current,
    refresh: async () => {
      if (!(await isSupported())) return
      const config = getRemoteConfig(app)
      await fetchAndActivate(config)
      const raw = Object.fromEntries(
        Object.entries(getAll(config)).map(([key, value]) => [key, value.asString()]),
      )
      const parsed = schema.safeParse(raw)
      if (parsed.success) current = parsed.data
    },
  }
}
