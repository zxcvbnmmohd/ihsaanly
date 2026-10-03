import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'
import { isPlainLeftClick } from './router-link'

beforeEach(resetApp)

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
  async function locationAnchor(): Promise<HTMLElement> {
    const [row] = await screen.findAllByRole('link', { name: new RegExp(strings.location.title) })
    const anchor = row?.closest('a')
    if (!anchor) throw new Error('the row is not inside an anchor')
    return anchor
  }

  it('navigates in the router on a plain click, without a page load', async () => {
    const { router } = await renderRoute('/settings')
    const anchor = await locationAnchor()
    expect(anchor).toHaveAttribute('href', '/location')

    const notPrevented = fireEvent.click(anchor)

    expect(notPrevented).toBe(false)
    await screen.findByRole('heading', { name: strings.location.title })
    expect(router.state.location.pathname).toBe('/location')
  })

  // A real click lands on the Pressable inside the anchor, whose own onClick
  // stops propagation; the router still has to get it (capture phase).
  it('navigates on a click aimed at the Pressable inside the anchor', async () => {
    const { router } = await renderRoute('/settings')
    const anchor = await locationAnchor()
    const pressable = anchor.firstElementChild
    if (!pressable) throw new Error('the anchor has no child')

    const notPrevented = fireEvent.click(pressable)

    expect(notPrevented).toBe(false)
    await screen.findByRole('heading', { name: strings.location.title })
    expect(router.state.location.pathname).toBe('/location')
  })

  it('leaves a modified click to the browser (open in a new tab)', async () => {
    const { router } = await renderRoute('/settings')
    const anchor = await locationAnchor()

    const notPrevented = fireEvent.click(anchor, { ctrlKey: true })

    expect(notPrevented).toBe(true)
    expect(router.state.location.pathname).toBe('/settings')
  })
})
