/// <reference types="vite/client" />

// The optional cloud-sync config. With any of the four required values
// missing the build is local-only (see src/cloud.ts).
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_EMULATOR_HOST?: string
  /** Where newer content is published (…/content). Unset: no update checks. */
  readonly VITE_CONTENT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
