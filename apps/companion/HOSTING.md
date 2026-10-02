# Hosting companion.ihsaanly.app

Same GoDaddy/cPanel host as `apps/marketing` (see `apps/marketing/HOSTING.md`
for the account-level setup this mirrors), one-time steps:

1. **cPanel → Domains**: one folder per app and branch, under
   `public_html/ihsaanly.app/<app>/<branch>/`:

   | Domain | Document root | Branch / GitHub environment |
   | --- | --- | --- |
   | `ihsaanly.app` | `/public_html/ihsaanly.app/marketing/production` | `production` |
   | `dev.ihsaanly.app` | `/public_html/ihsaanly.app/marketing/development` | `development` |
   | `companion.ihsaanly.app` | `/public_html/ihsaanly.app/companion/production` | `production` |
   | `dev.companion.ihsaanly.app` | `/public_html/ihsaanly.app/companion/development` | `development` |

   No site is nested in another, so none inherits another's `.htaccess`. Keep
   the parent folders (`public_html/`, `public_html/ihsaanly.app/` and the
   `<app>/` folders) free of an `.htaccess`: Apache merges parent directory
   config into child ones.
2. **SSL**: AutoSSL issues the certificates; keep Force HTTPS Redirect on for
   every domain (Firebase sign-in and the service worker need HTTPS).
3. **GitHub** (Settings → Environments → `production` / `development`): the
   secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` and the Firebase
   variables. The upload folder needs no setting: the FTP account
   (`support@ihsaanly.app`) is rooted at `/public_html/ihsaanly.app`, and
   `deploy-ftp.yml` uploads to `<app>/<branch>/` inside it. Add each domain to that Firebase project's
   Authentication → Authorized domains.
4. **Deploy**: `.github/workflows/deploy-companion.yml` calls the shared
   `deploy-ftp.yml` on every push to `development` or `production` touching `apps/companion/**`
   or `packages/**`; it builds with `bunx turbo build --filter=@ihsaanly/companion`
   (which runs the output, CSP and headless-Chrome checks) before uploading.

## Search engines, sharing and development builds

Marketing (`ihsaanly.app`) is the SEO surface and owns the sitemap. The
companion only needs to be described well and indexed at its door:

- `index.html` carries the title, description, canonical, theme colours,
  icons and Open Graph / Twitter tags (image: `public/og.png`, a copy of
  marketing's `og-en.png`). The canonical and `og:url` use `VITE_SITE_URL`,
  the build's own origin (CI sets it per environment; default
  `https://companion.ihsaanly.app`).
- Every path is the same `index.html`, so the per-route tags are set
  client-side by `src/head/use-document-head.ts` (Google renders the
  script): `<title>` becomes "<screen> · Ihsaanly" from the localized screen
  titles, and every route except `/` and `/onboarding/welcome` (where `/`
  sends a new visitor) gets `<meta name="robots" content="noindex">`.
- `robots.txt` (written by `scripts/postbuild.ts`) allows everything and names
  no sitemap: a `Disallow` would stop crawlers from ever seeing the noindex.

A development build (`VITE_APP_ENV=development`, set by `deploy-ftp.yml` from
the deploy's environment; see `packages/web/src/app-env.ts`) is kept out of
every index and is obvious on screen: a "Development" pill in the top-start
corner, titles prefixed "Dev · ", `noindex, nofollow` in `index.html` and as
`X-Robots-Tag` on every response, `robots.txt` disallowing everything, and
"Ihsaanly Dev" as the installed app's name. The labels are internal and stay
English. A production build has none of it.

## Filling in the dormant app-detection pieces

Everything in `@ihsaanly/web/app-links` (`APP_LINKS`) stays `null` — and the
Smart App Banner meta, the Android intent fallback and the store badges on
About all stay dormant — until the store listings exist:

- `iosAppId`: the numeric App Store id, once the app is listed.
- `appStoreUrl` / `playUrl`: the store listing URLs.
- The Apple Team ID placeholder (`TEAMID`) in `scripts/postbuild.ts`'s
  `apple-app-site-association`, once there is an Apple Developer Program
  membership.
- The `sha256_cert_fingerprints` placeholder in the same script's
  `assetlinks.json`, once the Android app's release signing key exists
  (`keytool -list -v` on the upload key, or Play Console's App Signing page).

`apps/mobile/app.json` already declares the matching `associatedDomains` and
Android `intentFilters` for `companion.ihsaanly.app`, so once both sides are
filled in, a shared link opens the installed app and falls back to this site
otherwise.

## Local checks

```
cd apps/companion
bun run build     # vite build + postbuild + output/CSP tests
bun run preview   # serves dist/ the way Apache will, at :4173
```
