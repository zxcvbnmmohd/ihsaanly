# Hosting the website

`bun run build:site` writes the whole site to `site/dist/`. Upload the
**contents** of that folder to the web root of `ihsaanly.app` (on GoDaddy
shared hosting, `public_html/`). Nothing else in the repository is needed.

- English is served at `/`, every other language at `/<code>/` (`/ar/`,
  `/fr/`, …). `sitemap.xml`, `robots.txt`, `404.html` and `site.webmanifest`
  sit at the root.
- The build also writes the host headers for you, with the current CSP hashes
  filled in: `.htaccess` (Apache, which is what GoDaddy shared hosting runs)
  and `_headers` (Netlify, Cloudflare Pages). Many FTP clients hide dotfiles:
  make sure `.htaccess` is actually uploaded.
- Upload everything each time. Stylesheets, scripts and fonts carry a content
  hash in their name (`site.187ff9c878.css`), so a new build never collides
  with a cached old one and old files can be deleted at leisure.

## The headers, and why

A static page cannot set these; the host must. The generated files contain
exactly the values below, so this section is a reference, not a step.

| Header                       | Value                                                | Why                                                                                        |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Content-Security-Policy`    | see below                                            | Only this site's own files may run; the privacy policy promises nothing else is loaded.    |
| `Strict-Transport-Security`  | `max-age=31536000`                                   | HTTPS only, for a year. Add `includeSubDomains; preload` only once every subdomain is TLS. |
| `X-Content-Type-Options`     | `nosniff`                                            | Browsers trust the declared type.                                                          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                    | The donate site learns only the origin, never the page.                                    |
| `Permissions-Policy`         | `accelerometer=(), camera=(), geolocation=(), …`     | The site uses no device features.                                                          |
| `X-Frame-Options`            | `DENY`                                               | Not framable; `frame-ancestors 'none'` says the same to modern browsers.                   |
| `Cross-Origin-Opener-Policy` | `same-origin`                                        | Isolates the window from pages it opens.                                                   |
| `Cache-Control`              | hashed assets: `public, max-age=31536000, immutable` | Their name changes whenever their content does.                                            |
|                              | images, `.txt`, `.map`: `public, max-age=2592000`    | Stable names (`og.png` is referenced by social sites), so 30 days.                         |
|                              | HTML and XML: `no-cache`                             | Always revalidated, so a new build is live at once.                                        |

The CSP, as the build prints it:

```
default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self' 'sha256-…';
img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
```

The two hashes allow the only inline code on the site: the theme script in
every `<head>` (it applies a stored light/dark choice before first paint) and
the one `<style>` in the demo's `<noscript>` fallback. The build computes both
from its own output and fails if it finds any other inline script or a
`style="…"` attribute, so editing a template cannot silently break the CSP. If
you edit `.htaccess` by hand, copy the policy from a fresh build rather than
from here.

## Apache (`.htaccess`), in outline

```apache
ErrorDocument 404 /404.html
AddType application/manifest+json .webmanifest
AddType font/woff2 .woff2

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "…from the build…"
  Header always set Strict-Transport-Security "max-age=31536000" env=HTTPS
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  Header always set X-Frame-Options "DENY"
  Header always set Cross-Origin-Opener-Policy "same-origin"
  <FilesMatch "\.[0-9a-f]{10}\.(css|js|woff2|ttf)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(html|xml)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json application/xml application/manifest+json image/svg+xml font/ttf
</IfModule>
```

Every block is wrapped in `<IfModule>`, so a host without a module skips it
instead of answering 500. If the site does answer 500 after an upload, the
host disallows one of these directives in `.htaccess`: remove blocks until it
loads, and tell the host which header you lost.

Compression matters here: the demo script is about 0.7 MB raw and about a
fifth of that compressed. `mod_deflate` handles it on Apache; check with
`curl -sI -H 'Accept-Encoding: gzip' https://ihsaanly.app/ | grep -i content-encoding`.

## Checking a deployment

```sh
curl -sI https://ihsaanly.app/ | grep -iE 'content-security|strict-transport|cache-control'
curl -s https://ihsaanly.app/robots.txt
curl -s -o /dev/null -w '%{http_code}\n' https://ihsaanly.app/no-such-page   # 404
```

Then open the site with the browser's console open: a CSP violation is
reported there by name.
