import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures.ts'
import { chooseCity, go } from './helpers.ts'

const ROUTES = [
  '/settings',
  '/location',
  '/calculation',
  '/hijri',
  '/notifications',
  '/language',
  '/appearance',
  '/qada',
  '/item/kahf-friday',
]

// Every violation fails, whatever its impact (minor to critical).
async function violations(page: import('@playwright/test').Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' ; ')}`,
  )
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme })

    test('Today (no location and with a plan) has no axe violations', async ({ openPopup }) => {
      const { page } = await openPopup()
      await expect(page.getByText('Where are you?')).toBeVisible()
      expect(await violations(page)).toEqual([])
      await chooseCity(page)
      await expect(page.getByText('PRAYERS')).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('every settings page has no axe violations', async ({ openPopup }) => {
      const { page } = await openPopup()
      const found: string[] = []
      for (const route of ROUTES) {
        await go(page, route)
        await page.waitForTimeout(400)
        found.push(...(await violations(page)).map((v) => `${route}: ${v}`))
      }
      expect(found).toEqual([])
    })
  })
}
