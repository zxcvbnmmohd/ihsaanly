/// <reference types="vite/client" />

// Build-time settings. Unset → the production web app (see src/i18n/locales.ts).
interface ImportMetaEnv {
  readonly VITE_COMPANION_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
