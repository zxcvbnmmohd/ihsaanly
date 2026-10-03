import { afterAll, describe, expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import type { DevelopmentBadge as Badge } from './development-badge.tsx'

// `isDevelopmentBuild` is fixed when the module loads, so each build kind
// gets its own copy of the module, loaded under its own VITE_APP_ENV.
interface Module {
  DevelopmentBadge: typeof Badge
  isDevelopmentBuild: boolean
}
const original = process.env.VITE_APP_ENV

async function load(env: string, copy = ''): Promise<Module> {
  process.env.VITE_APP_ENV = env
  return (await import(`./development-badge.tsx${copy}`)) as Module
}

// Loaded in this order so the coverage report, which keys both copies to one file, keeps the development run.
const production = await load('production', '?production')
const development = await load('development')
afterAll(() => {
  if (original === undefined) delete process.env.VITE_APP_ENV
  else process.env.VITE_APP_ENV = original
})

describe('DevelopmentBadge', () => {
  test('is only a development build when VITE_APP_ENV says so', () => {
    expect(development.isDevelopmentBuild).toBe(true)
    expect(production.isDevelopmentBuild).toBe(false)
  })

  test('a development build shows "Development" pinned to the corner', () => {
    render(<development.DevelopmentBadge />)
    const badge = screen.getByRole('note', { name: 'Development build' })
    expect(badge).toHaveTextContent('Development')
    expect(badge.className).toContain('fixed')
    expect(badge.className).not.toContain('rounded-full')
  })

  test('takes a label, and sits in the flow when inline', () => {
    render(<development.DevelopmentBadge label="Beta" placement="inline" />)
    const badge = screen.getByRole('note', { name: 'Beta build' })
    expect(badge).toHaveTextContent('Beta')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).not.toContain('fixed')
  })

  test('a production build renders nothing', () => {
    const { container } = render(<production.DevelopmentBadge label="Beta" />)
    expect(container).toBeEmptyDOMElement()
  })
})
