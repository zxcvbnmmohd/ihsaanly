import { describe, expect, it } from 'bun:test'
import { RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { settle } from '../test/route'
import { router } from './router'

describe('router', () => {
  it('keeps its routes in the hash, since an extension page has no server to fall back to', async () => {
    await settle(async () => {
      render(<RouterProvider router={router} />)
    })
    await settle(() => router.navigate({ href: '/settings' }))
    expect(window.location.hash).toBe('#/settings')
    expect(router.state.location.pathname).toBe('/settings')
    await settle(() => router.navigate({ href: '/' }))
  })

  it('knows every popup screen', () => {
    expect(Object.keys(router.routesByPath).sort()).toEqual([
      '/',
      '/account',
      '/appearance',
      '/calculation',
      '/feedback',
      '/glossary',
      '/hijri',
      '/item/$id',
      '/language',
      '/location',
      '/notifications',
      '/qada',
      '/settings',
    ])
  })
})
