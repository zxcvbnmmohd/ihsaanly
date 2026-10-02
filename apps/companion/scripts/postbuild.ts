// Runs after `vite build`. Everything a static Apache host needs that a
// static SPA cannot set for itself: one Content-Security-Policy (every route
// is the same index.html), security and cache headers, the offline service
// worker, and the app-detection well-known files.
//
//   dist/.htaccess                    Apache (GoDaddy shared hosting)
//   dist/_headers                     Netlify / Cloudflare Pages
//   dist/headers.json                 the same policy, for scripts/serve.ts and the tests
//   dist/sw.js                        offline precache + update banner
//   dist/.well-known/apple-app-site-association, assetlinks.json
//   dist/robots.txt                   allow all (production) or disallow all (development)
//
// A development build (VITE_APP_ENV=development, dev.companion.ihsaanly.app)
// is also renamed "Ihsaanly Dev" in its manifest, and every response carries
// X-Robots-Tag: noindex, nofollow (index.html has the matching robots meta).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEVELOPMENT_ROBOTS, resolveAppEnv, robotsTxt } from '@ihsaanly/web/app-env'
import {
  cspHash,
  type HeaderMap,
  inlineBlocks,
  pageCsp,
  permissionsPolicy,
} from '@ihsaanly/web/hosting/csp'
import { buildHeadersFile, buildHtaccess } from '@ihsaanly/web/hosting/htaccess'

const ROOT = join(import.meta.dir, '..')
const DIST = join(ROOT, 'dist')
const APP_ENV = resolveAppEnv(process.env.VITE_APP_ENV)
const DEVELOPMENT = APP_ENV === 'development'

// ---- one CSP for the whole app ----

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
if (/<[a-z][^>]*\sstyle="/i.test(html)) {
  console.error('index.html: a style attribute the CSP blocks')
  process.exit(1)
}

// Cloud sync (optional): only widened when the build has a Firebase auth domain.
// - connect-src: the hosts the Auth and Firestore SDKs call, listed one by one (no
//   *.googleapis.com wildcard, no Installations or Remote Config).
// - frame-src: signInWithPopup loads the hidden helper iframe at
//   https://<authDomain>/__/auth/iframe.
// - script-src: the popup resolver loads Google's gapi loader from apis.google.com.
// The popup window itself is not a frame and needs no directive.
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN?.trim()
const cloudDirectives: Record<string, string> = {}
const inline = inlineBlocks(html)
if (authDomain) {
  cloudDirectives['connect-src'] = [
    "'self'",
    'https://securetoken.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://firestore.googleapis.com',
  ].join(' ')
  cloudDirectives['frame-src'] = `https://${authDomain}`
  cloudDirectives['script-src'] = [
    "'self'",
    ...new Set(inline.scripts.map(cspHash)),
    'https://apis.google.com',
  ].join(' ')
}

const policy = pageCsp(inline, {
  directives: {
    'img-src': "'self' data: blob:",
    'worker-src': "'self'",
    'manifest-src': "'self'",
    ...cloudDirectives,
  },
})

// Every client route is the same index.html; the fallback carries the one
// policy too, so a path Apache never rewrote (a direct request behind a
// proxy, say) still gets it.
const headerMap: HeaderMap = {
  pages: { '/': policy },
  fallback: policy,
  // COMMON_HEADERS denies geolocation; the Location screen needs it from `self`.
  headers: {
    'Permissions-Policy': permissionsPolicy({ geolocation: '(self)' }),
    ...(DEVELOPMENT ? { 'X-Robots-Tag': DEVELOPMENT_ROBOTS } : {}),
  },
}

writeFileSync(join(DIST, 'headers.json'), `${JSON.stringify(headerMap, null, 2)}\n`)

// ---- .htaccess / _headers ----

let htaccess = buildHtaccess({ headerMap, spaFallback: '/index.html' })
const headers = buildHeadersFile(headerMap)

// buildHtaccess's own cache tiers cover hashed assets (1y, immutable) and
// `.html`/`.xml`/`.json` (no-cache), but sw.js, the manifest and the
// well-known files either have no hash in their name or no extension at all,
// so they fall through those rules. Each must be revalidated on every visit:
// a stale sw.js or AASA file is a broken update or a broken deep link.
const NEVER_CACHE = `
  <FilesMatch "^(sw\\.js|manifest\\.webmanifest)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <Files "apple-app-site-association">
    Header set Cache-Control "no-cache"
    ForceType application/json
  </Files>
  <Files "assetlinks.json">
    Header set Cache-Control "no-cache"
  </Files>
`
htaccess = htaccess.replace(
  '</IfModule>\n\n<IfModule mod_deflate.c>',
  `${NEVER_CACHE}</IfModule>\n\n<IfModule mod_deflate.c>`,
)

writeFileSync(join(DIST, '.htaccess'), htaccess)
writeFileSync(join(DIST, '_headers'), headers)

// ---- indexing and the install name ----

// Marketing (ihsaanly.app) is the SEO surface and has the sitemap; here only
// the door is indexable, which src/head/use-document-head.ts enforces per
// route with a robots meta, since every path is the same index.html.
writeFileSync(join(DIST, 'robots.txt'), robotsTxt(APP_ENV))

if (DEVELOPMENT) {
  const file = join(DIST, 'manifest.webmanifest')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  manifest.name = 'Ihsaanly Dev'
  manifest.short_name = 'Ihsaanly Dev'
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
}

// ---- offline service worker ----

function distFiles(dir = DIST, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    const relPath = prefix ? `${prefix}/${name}` : name
    if (statSync(path).isDirectory()) return distFiles(path, relPath)
    const SKIP = new Set(['.htaccess', '_headers', 'headers.json', 'sw.js', 'robots.txt'])
    if (SKIP.has(relPath) || relPath.startsWith('.well-known/')) return []
    return [relPath]
  })
}

const files = distFiles()
const precached = files.map((path) => `/${path}`)
// The navigation fallback below always looks up /index.html by name, so the
// root URL itself needs no separate cache entry.
const version = createHash('sha256')
  .update(
    files
      .map((path) => `${path}\u0000${readFileSync(join(DIST, path)).toString('base64')}`)
      .join('\n'),
  )
  .digest('hex')
  .slice(0, 16)

// ponytail: hand-rolled, no workbox. Navigations go network-first so a
// deploy is live the moment it lands; hashed assets are immutable so
// cache-first is always correct; everything else in the precache list is a
// safety net for the one visit that happens to be offline.
const SW = `// ponytail: hand-rolled service worker, generated by scripts/postbuild.ts.
const VERSION = ${JSON.stringify(version)}
const CACHE = \`ihsaanly-\${VERSION}\`
const PRECACHE = ${JSON.stringify(precached)}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    )
    return
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached ?? Response.error())))
})
`

writeFileSync(join(DIST, 'sw.js'), SW)

// ---- app detection: universal / app links ----

const WELL_KNOWN = join(DIST, '.well-known')
if (!existsSync(WELL_KNOWN)) mkdirSync(WELL_KNOWN)

// TODO: replace TEAMID once the Apple Developer Program membership exists.
const AASA = {
  applinks: {
    details: [
      {
        appIDs: ['TEAMID.app.ihsaanly.companion'],
        components: [{ '/': '/*', comment: 'Every path opens the app when it is installed.' }],
      },
    ],
  },
}
writeFileSync(join(WELL_KNOWN, 'apple-app-site-association'), `${JSON.stringify(AASA, null, 2)}\n`)

// TODO: replace the sha256 fingerprint once the signing key exists.
const ASSETLINKS = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'app.ihsaanly.companion',
      sha256_cert_fingerprints: ['TODO:REPLACE_WITH_SIGNING_SHA256'],
    },
  },
]
writeFileSync(join(WELL_KNOWN, 'assetlinks.json'), `${JSON.stringify(ASSETLINKS, null, 2)}\n`)

console.log(`postbuild: one CSP, ${precached.length} files precached (sw ${version}, ${APP_ENV})`)
