# Hosting the marketing site

`bun run build` (or `bunx turbo build --filter=@ihsaanly/marketing` from the
repo root) prerenders the whole site into `dist/client/`. Upload the
**contents** of that folder to the web root of `ihsaanly.app` (on GoDaddy shared
hosting, `public_html/`). The deploy workflow does this over FTPS on every push
to `production`.

- English is served at `/`, every other language at `/<code>/` (`/ar/`, `/fr/`,
  …). `sitemap.xml`, `robots.txt`, `404.html` and `site.webmanifest` sit at the
  root.
- `__tsr/staticServerFnCache/*.json` holds the result of every server function,
  computed at build time. Client-side navigation reads these files, so the site
  needs no server. Upload them with everything else.
- Many FTP clients hide dotfiles: make sure `.htaccess` is uploaded.

## Why each page has its own Content-Security-Policy

TanStack Start writes a small inline script into every page that hands the
prerendered data to React. Its contents differ per page and per build, and a
static host cannot add per-request nonces. So `scripts/postbuild.ts` hashes the
inline scripts of each page and writes that page's policy into `.htaccess`
inside an `<If "%{REQUEST_URI} -in {…}">` block (Apache 2.4). Any other path,
including 404s, gets the 404 page's policy. Nothing allows `unsafe-inline` or
`unsafe-eval`, and zod runs in jitless mode so it never needs `eval`.

The same policies are written to `_headers` (Netlify, Cloudflare Pages) and
`dist/headers.json`, which `bun run preview` uses to serve the build locally
with the real headers. The build fails if any page has an inline script or
style its policy does not allow, or if headless Chrome reports a violation.

The home page's phone demo renders the app's shared screens through
react-native-web, which inserts one `<style>` element at runtime and writes a
fixed preamble into it before switching to CSSOM rules. Every policy allows
the hashes of that element's two text states (`RUNTIME_STYLES` in
`scripts/csp.ts`); a react-native-web upgrade that changes them fails the
headless-Chrome test. The demo is a lazily loaded chunk that only runs in the
browser, so the prerendered page carries just its static fallback.

## The other headers

| Header                       | Value                                                | Why                                                                                        |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Strict-Transport-Security`  | `max-age=31536000`                                   | HTTPS only, for a year.                                                                    |
| `X-Content-Type-Options`     | `nosniff`                                            | Browsers trust the declared type.                                                          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                    | The donate site learns only the origin, never the page.                                    |
| `Permissions-Policy`         | `accelerometer=(), camera=(), geolocation=(), …`     | The site uses no device features.                                                          |
| `X-Frame-Options`            | `DENY`                                               | Not framable; `frame-ancestors 'none'` says the same to modern browsers.                   |
| `Cross-Origin-Opener-Policy` | `same-origin`                                        | Isolates the window from pages it opens.                                                   |
| `Cache-Control`              | hashed assets: `public, max-age=31536000, immutable` | Vite puts a content hash in their names.                                                   |
|                              | images, `.txt`, manifest: `public, max-age=2592000`  | Stable names (`og-<code>.png` are referenced by social sites), so 30 days.                         |
|                              | HTML, XML, JSON: `no-cache`                          | Always revalidated, so a new build is live at once.                                        |

## Share images

Each language has its own Open Graph image, `public/assets/og-<code>.png`
(1200x630), which the page head points `og:image` at; `og.png` stays as the
English default. They are rendered locally by `bun run og`
(`scripts/og-images.ts`), which screenshots an HTML page per language with the
local Google Chrome (set `CHROME` to use another binary), and the PNGs are
committed. Rerun `bun run og` whenever `home.hero.title`, `home.private.title`
or `home.calm.title` change in any language; CI does not render them. Fonts
come from `tooling/tailwind/tokens.ts`: Amiri (bundled) for Arabic, the system
Noto Nastaliq Urdu for Urdu, and the macOS serif stacks for the rest.

## Moving to a server later

The app uses TanStack Start's full model: loaders, typed server functions and
per-route SSR modes. On a host that runs Node, turn off `prerender` in
`vite.config.ts`, drop `staticFunctionMiddleware` from the server functions and
deploy `dist/server`. Routes, loaders and components stay the same.
