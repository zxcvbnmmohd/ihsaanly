import type { Page } from '@playwright/test'

/**
 * Collects console errors and uncaught exceptions; assert it is empty at the
 * end of a test. Chromium reports every Content-Security-Policy violation as a
 * console error ("Refused to … because it violates …"), so this catches those
 * too. `ignore` drops expected noise, such as the failed requests of a test
 * that takes the network away on purpose.
 */
export function collectErrors(page: Page, ignore: RegExp[] = []): string[] {
  const errors: string[] = []
  const push = (line: string): void => {
    if (!ignore.some((pattern) => pattern.test(line))) errors.push(line)
  }
  page.on('console', (message) => {
    if (message.type() === 'error') push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => push(`pageerror: ${error.message}`))
  return errors
}
