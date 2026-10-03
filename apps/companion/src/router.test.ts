import { expect, it } from 'bun:test'
import { router } from './router'

it('is the router over the generated route tree, preloading on intent', () => {
  expect(router.options.defaultPreload).toBe('intent')
  expect(Object.keys(router.routesByPath).sort()).toEqual(
    expect.arrayContaining(['/', '/today', '/library', '/more', '/account', '/onboarding/$step']),
  )
})
