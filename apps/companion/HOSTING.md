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
