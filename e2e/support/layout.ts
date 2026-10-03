import type { Page } from '@playwright/test'

/** How far the page scrolls sideways beyond the viewport (0 when nothing overflows). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement
    return root.scrollWidth - root.clientWidth
  })
}
