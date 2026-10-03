// Content updates: a newer bundle published on the content host is downloaded
// after the app opens and shown from the next open on, offline included. A
// bundle that fails validation changes nothing. The host is served here, at
// the URL the e2e builds point at (support/build.ts).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { BrowserContext, Page } from '@playwright/test'
import { E2E_CONTENT_URL } from '../support/build.ts'
import { contentItem } from './content.ts'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

const CONTENT = join(import.meta.dirname, '..', '..', 'packages', 'core', 'content')
const read = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(CONTENT, file), 'utf8')) as Record<string, unknown>

const ID = 'dua-sleeping'
const OLD_TITLE = contentItem(ID).title
const NEW_TITLE = 'Before sleeping (updated)'
const VERSION = 'abcdef012345'

interface Item {
  id: string
  title: Record<string, string>
}

/** items.json with the one item retitled, as a newer publish would carry it. */
function updatedItems(): unknown {
  const document = read('items.json')
  const items = (document.items as Item[]).map((item) =>
    item.id === ID ? { ...item, title: { ...item.title, en: NEW_TITLE } } : item,
  )
  return { ...document, items }
}

/** The content host: a manifest naming `VERSION`, and its files. */
async function publish(context: BrowserContext, items: unknown): Promise<void> {
  const files: Record<string, unknown> = {
    'manifest.json': {
      schemaVersion: 1,
      version: VERSION,
      publishedAt: '2026-10-01T00:00:00.000Z',
      items: `v${VERSION}/items.json`,
      glossary: `v${VERSION}/glossary.json`,
      translations: {},
    },
    [`v${VERSION}/items.json`]: items,
    [`v${VERSION}/glossary.json`]: read('glossary.json'),
  }
  await context.route(`${E2E_CONTENT_URL}/**`, (route) => {
    const path = route.request().url().slice(`${E2E_CONTENT_URL}/`.length)
    const body = files[path]
    return route.fulfill({
      status: body === undefined ? 404 : 200,
      json: body ?? { missing: path },
      headers: { 'access-control-allow-origin': '*' },
    })
  })
}

const stored = (page: Page, key: string): Promise<string | null> =>
  page.evaluate((name) => localStorage.getItem(`ihsaanly.content.v1.${name}`), key)

async function openItem(page: Page): Promise<void> {
  await page.goto(`/item/${ID}`)
}

test('a published update shows from the next open on, offline too', async ({
  page,
  context,
  errors,
}) => {
  await publish(context, updatedItems())

  // This open still shows what the app shipped with, and downloads the update.
  await openItem(page)
  await expect(page).toHaveTitle(`${OLD_TITLE} · Ihsaanly`)
  await expect.poll(() => stored(page, 'bundle')).not.toBeNull()
  await expect(page).toHaveTitle(`${OLD_TITLE} · Ihsaanly`)

  // The next open installs it before anything renders.
  await page.reload()
  await expect(page).toHaveTitle(`${NEW_TITLE} · Ihsaanly`)
  await expect(page.getByText(NEW_TITLE, { exact: true }).first()).toBeVisible()

  // Offline (the service worker serves the app), the downloaded content stays.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      )
    }
  })
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await caches.keys()
        if (keys.length === 0) return false
        const cache = await caches.open(keys[0] as string)
        return (await cache.match('/index.html')) !== undefined
      }),
    )
    .toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page).toHaveTitle(`${NEW_TITLE} · Ihsaanly`)
  await context.setOffline(false)
  expect(errors).toEqual([])
})

test('a bundle that fails validation is never installed', async ({ page, context, errors }) => {
  const broken = { ...(updatedItems() as Record<string, unknown>), schemaVersion: 99 }
  await publish(context, broken)

  await openItem(page)
  // The check ran, rejected the bundle and cached nothing.
  await expect.poll(() => stored(page, 'checkedAt')).not.toBeNull()
  expect(await stored(page, 'bundle')).toBeNull()

  await page.reload()
  await expect(page).toHaveTitle(`${OLD_TITLE} · Ihsaanly`)
  expect(errors).toEqual([])
})
