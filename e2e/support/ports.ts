// The ports the root Playwright config serves each production build on
// (the extension and sync suites have their own configs and ports).
export const MARKETING_PORT = 4310
export const COMPANION_PORT = 4311
/** The companion built with placeholder cloud config (build.ts `companion-cloud`). */
export const COMPANION_CLOUD_PORT = 4312

export const MARKETING_URL = `http://localhost:${MARKETING_PORT}`
export const COMPANION_URL = `http://localhost:${COMPANION_PORT}`
export const COMPANION_CLOUD_URL = `http://localhost:${COMPANION_CLOUD_PORT}`
