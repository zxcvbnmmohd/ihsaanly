// Accessibility checks with axe-core: WCAG 2.0/2.1/2.2 A and AA rules. Every
// violation fails a test, whatever its impact (minor to critical).
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

export interface AxeFinding {
  id: string
  impact: string | null | undefined
  help: string
  targets: string[]
}

/**
 * Waits for the page to stop moving: fonts loaded and every CSS animation or
 * transition finished. Mid fade-in, text is semi-transparent and axe reads
 * that as a contrast failure that no one ever sees.
 */
export async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getTiming().iterations === Infinity,
      ),
  )
}

/** Every WCAG violation on the page as it is now, one line each. */
export async function axeViolations(
  page: Page,
  options: { exclude?: string[]; disableRules?: string[] } = {},
): Promise<AxeFinding[]> {
  await settled(page)
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector)
  if (options.disableRules?.length) builder = builder.disableRules(options.disableRules)
  const { violations } = await builder.analyze()
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
  }))
}
