// Which deployment a build is for: one build variable, VITE_APP_ENV
// ('development' | 'production'). CI sets it from the deploy's environment
// (.github/workflows/deploy-ftp.yml); the extension's `package:beta` script
// sets it to development. Unset, `vite dev` (and a `--mode development`
// build) is development and any other build is production.
//
// A development build is marked so it is never mistaken for, or indexed as,
// the real thing: a "Development" pill, a "Dev" title, and noindex. The
// labels are internal and stay English.
//
// Node-safe (vite configs and postbuild scripts import it); the bundle-time
// flag itself, `isDevelopmentBuild`, lives in ./development-badge.tsx.

export type AppEnv = 'development' | 'production'

/** The value as given, or the default for a dev (`true`) or production build. */
export function resolveAppEnv(value: string | undefined, dev = false): AppEnv {
  const given = value?.trim()
  if (given === 'development' || given === 'production') return given
  return dev ? 'development' : 'production'
}

/** Prefixed to a development build's document titles. */
export const DEV_TITLE_PREFIX = 'Dev · '

/** `noindex, nofollow`: the robots meta and X-Robots-Tag of a development build. */
export const DEVELOPMENT_ROBOTS = 'noindex, nofollow'

/** robots.txt: a development build blocks every crawler; production allows all, with its sitemap if any. */
export function robotsTxt(env: AppEnv, sitemap?: string): string {
  if (env === 'development') return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\n${sitemap ? `\nSitemap: ${sitemap}\n` : ''}`
}
