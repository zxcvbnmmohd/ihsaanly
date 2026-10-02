// The web app the site links to, set per deploy (the dev site points at the
// dev web app). Read at build time, so it is baked into the prerendered pages.
// Kept apart from i18n/locales.ts, which vite.config.ts and the Bun scripts
// import outside Vite, where import.meta.env does not exist.
export const COMPANION_URL: string =
  import.meta.env.VITE_COMPANION_URL || 'https://companion.ihsaanly.app'
