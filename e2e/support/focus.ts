import type { Page } from '@playwright/test'

/**
 * Presses Tab `count` times and describes each focus stop, or '' for one that
 * is the body, hidden, or drawn without a focus ring (no outline or box shadow).
 */
export async function tabStops(page: Page, count: number): Promise<string[]> {
  const stops: string[] = []
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab')
    stops.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body || !el.checkVisibility()) return ''
        const style = getComputedStyle(el)
        const ring =
          (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== 'none'
        if (!ring) return ''
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30)
        return `${el.tagName}|${el.getAttribute('role') ?? ''}|${name}`
      }),
    )
  }
  return stops
}
