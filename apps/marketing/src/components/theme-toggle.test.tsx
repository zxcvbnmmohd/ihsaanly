import { afterEach, describe, expect, test } from 'bun:test'
import { THEME_KEY } from '@ihsaanly/web/theme'
import { screen } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { ThemeToggle } = await import('./theme-toggle')

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  window.localStorage.clear()
})

function button(): HTMLElement {
  return document.querySelector('button[data-mode]') as HTMLElement
}

describe('ThemeToggle', () => {
  test('starts on System and shows once mounted', () => {
    const { strings } = renderSite(<ThemeToggle />)
    expect(button()).toHaveAttribute('data-mode', 'system')
    expect(button()).not.toHaveAttribute('hidden')
    expect(button()).toHaveAttribute('title', strings['common.theme.system'])
    expect(button()).toHaveAttribute(
      'aria-label',
      (strings['common.theme.current'] ?? '').replace(
        '{mode}',
        strings['common.theme.system'] ?? '',
      ),
    )
  })

  test('shows what the page already applied', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    renderSite(<ThemeToggle />)
    expect(button()).toHaveAttribute('data-mode', 'dark')
  })

  test('cycles System, Light, Dark, applying and remembering each', async () => {
    const { user } = renderSite(<ThemeToggle />)
    await user.click(button())
    expect(button()).toHaveAttribute('data-mode', 'light')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')

    await user.click(button())
    expect(button()).toHaveAttribute('data-mode', 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark')

    await user.click(button())
    expect(button()).toHaveAttribute('data-mode', 'system')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull()
  })

  test('draws a different icon for each mode', async () => {
    const { user } = renderSite(<ThemeToggle />)
    const icons = new Set<string>()
    for (let step = 0; step < 3; step++) {
      icons.add(button().querySelector('svg')?.innerHTML ?? '')
      await user.click(button())
    }
    expect(icons.size).toBe(3)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('the ?theme= search value is the first guess before the page confirms', () => {
    renderSite(<ThemeToggle />, { search: { theme: 'dark' } })
    // The effect then reads what the document really applied: nothing.
    expect(button()).toHaveAttribute('data-mode', 'system')
  })
})
