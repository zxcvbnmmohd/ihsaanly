// The Link the @ihsaanly/ui screens draw through: a real anchor around their
// Pressable that hands a plain click to the router.
import { beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { fireEvent, screen } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'
import { isPlainLeftClick } from './router-link'

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

const click = (init: Partial<MouseEventInit>): Parameters<typeof isPlainLeftClick>[0] =>
  new MouseEvent('click', init) as unknown as Parameters<typeof isPlainLeftClick>[0]

describe('isPlainLeftClick', () => {
  it('is only the unmodified primary button', () => {
    expect(isPlainLeftClick(click({ button: 0 }))).toBe(true)
    expect(isPlainLeftClick(click({ button: 1 }))).toBe(false)
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      expect(isPlainLeftClick(click({ button: 0, [modifier]: true }))).toBe(false)
    }
  })
})

describe('RouterLink', () => {
  async function languageAnchor(): Promise<HTMLElement> {
    const [row] = await screen.findAllByRole('link', { name: /^Language/ })
    const anchor = row?.closest('a')
    if (!anchor) throw new Error('the row is not inside an anchor')
    return anchor
  }

  // A real click lands on the Pressable inside the anchor, whose own onClick
  // stops propagation (react-native-web); the router still has to get it, or
  // the browser follows the href with a full page load.
  it('routes a click aimed at the Pressable inside the anchor, without a page load', async () => {
    const app = await renderApp('/more')
    const anchor = await languageAnchor()
    expect(anchor).toHaveAttribute('href', '/language')
    const pressable = anchor.firstElementChild
    if (!pressable) throw new Error('the anchor has no child')

    const notPrevented = fireEvent.click(pressable)

    expect(notPrevented).toBe(false)
    expect(await screen.findByRole('radio', { name: 'English' })).toBeInTheDocument()
    expect(app.router.state.location.pathname).toBe('/language')
    expect(screen.queryByPlaceholderText(en.more.search)).toBeNull()
  })

  it('leaves a modified click to the browser (open in a new tab)', async () => {
    const app = await renderApp('/more')
    const anchor = await languageAnchor()

    const notPrevented = fireEvent.click(anchor, { metaKey: true })

    expect(notPrevented).toBe(true)
    expect(app.router.state.location.pathname).toBe('/more')
  })
})
