import type { Page } from '@playwright/test'

/**
 * In-app navigation by hash route. The popup uses hash history, so this keeps
 * the history stack (Back works) without a reload. Clicking RouterLink rows is
 * covered separately in navigation.spec.ts.
 */
export async function go(page: Page, route: string): Promise<void> {
  await page.evaluate((r) => {
    location.hash = `#${r}`
  }, route)
}

/** Picks a city through the Location screen (reached from Today, so Back returns there). */
export async function chooseCity(
  page: Page,
  query = 'London',
  label = /^London, Westminster/,
): Promise<void> {
  await go(page, '/location')
  await page.getByPlaceholder('Search for a city').fill(query)
  await page.getByRole('button', { name: label }).click()
}

export async function alarmNames(worker: import('@playwright/test').Worker): Promise<string[]> {
  return worker.evaluate(async () =>
    (await chrome.alarms.getAll()).map((a: { name: string }) => a.name),
  )
}
