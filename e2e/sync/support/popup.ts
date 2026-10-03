// The Auth emulator's stand-in for Google/Apple: signInWithPopup (and
// reauthenticateWithPopup, linkWithPopup) open
// http://127.0.0.1:9099/emulator/auth/handler, which lists the emulator's
// accounts for that provider and offers "Add new account". Each added account
// gets a random provider uid, so a second device picks the existing entry
// rather than adding the same email again.
//
// The popup hands its result to the SDK's hidden relay iframe in the opener
// (…/emulator/auth/iframe, bootstrapped by gapi). A result sent before that
// iframe is listening is dropped and the popup just stays open, so wait for the
// iframe to exist, and press again if the popup has not closed.
import { expect, type Page } from '@playwright/test'

async function relayReady(opener: Page): Promise<void> {
  await expect
    .poll(() => opener.frames().some((frame) => frame.url().includes('/emulator/auth/iframe')), {
      message: 'the Auth emulator relay iframe',
    })
    .toBe(true)
}

export interface PopupOptions {
  /**
   * false: a new identity whose provider does not vouch for the email. The
   * emulator's form always sends `email_verified: true`, and a verified email
   * is linked to the existing account silently; an unverified one is what
   * makes Firebase answer account-exists-with-different-credential.
   */
  emailVerified?: boolean
}

/** Completes an emulator sign-in popup as `email`, picking the account if it exists. */
export async function completePopup(
  opener: Page,
  popup: Page,
  email: string,
  { emailVerified = true }: PopupOptions = {},
): Promise<void> {
  await popup.waitForLoadState('load')
  await relayReady(opener)
  if (!emailVerified) return finishUnverified(popup, email)
  const existing = popup.locator('.js-reuse-account').filter({ hasText: email })
  const add = popup.getByRole('button', { name: 'Add new account' })
  const submit = popup.locator('#sign-in')
  await existing.or(add).first().waitFor()
  const reuse = (await existing.count()) > 0
  if (!reuse) {
    await add.click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#display-name-input').fill(email.split('@')[0] as string)
  }
  await pressUntilClosed(popup, email, () => (reuse ? existing.first() : submit).click())
}

async function pressUntilClosed(
  popup: Page,
  email: string,
  press: () => Promise<void>,
): Promise<void> {
  const closed = popup.waitForEvent('close', { timeout: 0 }).then(() => true)
  for (let attempt = 0; attempt < 5 && !popup.isClosed(); attempt++) {
    await press().catch(() => {})
    const done = await Promise.race([
      closed,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3_000)),
    ])
    if (done) return
  }
  if (popup.isClosed()) return
  const shown = (
    await popup
      .locator('body')
      .innerText()
      .catch(() => '')
  ).slice(0, 300)
  throw new Error(`The emulator sign-in popup for ${email} never closed. It shows: ${shown}`)
}

/** The handler page's own finishWithUser, with claims the form cannot produce. */
async function finishUnverified(popup: Page, email: string): Promise<void> {
  await popup.getByRole('button', { name: 'Add new account' }).waitFor()
  const sub = String(Date.now()).padEnd(21, '7')
  await pressUntilClosed(popup, email, () =>
    popup.evaluate(
      ({ email, sub }) => {
        const claims = { sub, iss: '', aud: '', exp: 0, iat: 0, email, email_verified: false }
        const finish = (
          window as unknown as { finishWithUser: (token: string, email: string) => void }
        ).finishWithUser
        finish(encodeURIComponent(JSON.stringify(claims)), email)
      },
      { email, sub },
    ),
  )
}

/**
 * Runs `trigger` on `page`, then completes the popup it opens as `email`.
 *
 * On a cold start the SDK's relay iframe sometimes never takes the popup's
 * result, however often it is resent. Closing the popup is then an ordinary
 * "closed by user" for the app (nothing changes), so close it and run
 * `trigger` again — it must lead from the current screen to the popup.
 */
export async function withPopup(
  page: Page,
  trigger: () => Promise<void>,
  email: string,
  options?: PopupOptions,
): Promise<void> {
  for (let round = 1; ; round++) {
    const opened = page.waitForEvent('popup')
    await trigger()
    const popup = await opened
    try {
      await completePopup(page, popup, email, options)
      return
    } catch (error) {
      if (round >= 3) throw error
      await popup.close().catch(() => {})
      // Let the app settle the cancelled sign-in before pressing again.
      await page.waitForTimeout(1_000)
    }
  }
}
