// Runs once, after the webServers are up and before any test:
// 1. Warms every server and its first page load. A cold Bun.serve plus a
//    cold Chromium made the first test of a run time out now and then.
// 2. Walks the companion's onboarding once and saves the storage, so the
//    journeys that start on Today do not each repeat it.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import { onboardWithCity } from '../companion/onboard.ts'
import { FIXED_NOW, TIMEZONE } from './clock.ts'
import { COMPANION_CLOUD_URL, COMPANION_URL, MARKETING_URL } from './ports.ts'

export const ONBOARDED_STATE = join(import.meta.dirname, '..', '.builds', 'state', 'onboarded.json')

async function waitForServer(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`${url} did not answer within ${timeoutMs} ms`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const urls = [MARKETING_URL, COMPANION_URL, COMPANION_CLOUD_URL]
  await Promise.all(urls.map((url) => waitForServer(`${url}/`)))

  const browser = await chromium.launch()
  try {
    // Warm: one full load of each app, so the servers have read their files
    // and the browser has compiled the bundles once.
    await Promise.all(
      urls.map(async (url) => {
        const page = await browser.newPage()
        await page.goto(`${url}/`, { waitUntil: 'networkidle' })
        await page.close()
      }),
    )

    const context = await browser.newContext({ timezoneId: TIMEZONE, locale: 'en-GB' })
    const page = await context.newPage()
    await page.clock.setFixedTime(FIXED_NOW)
    await page.goto(`${COMPANION_URL}/`)
    await onboardWithCity(page)
    mkdirSync(dirname(ONBOARDED_STATE), { recursive: true })
    await context.storageState({ path: ONBOARDED_STATE })
    await context.close()
  } finally {
    await browser.close()
  }
}
