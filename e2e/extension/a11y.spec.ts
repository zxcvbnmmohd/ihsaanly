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

async function serious(page: import('@playwright/test').Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
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

    test('Today (no location and with a plan) has no serious axe violations', async ({
      openPopup,
    }) => {
      const { page } = await openPopup()
      await expect(page.getByText('Where are you?')).toBeVisible()
      expect(await serious(page)).toEqual([])
      await chooseCity(page)
      await expect(page.getByText('PRAYERS')).toBeVisible()
      expect(await serious(page)).toEqual([])
    })

    test('every settings page has no serious axe violations', async ({ openPopup }) => {
      const { page } = await openPopup()
      const found: string[] = []
      for (const route of ROUTES) {
        await go(page, route)
        await page.waitForTimeout(400)
        found.push(...(await serious(page)).map((v) => `${route}: ${v}`))
      }
      expect(found).toEqual([])
    })
  })
}
