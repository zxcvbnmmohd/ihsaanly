import { expect, test } from 'bun:test'

const { getRouter } = await import('./router')

test('the router serves pages as directories and restores scroll', () => {
  const router = getRouter()
  expect(router.options.trailingSlash).toBe('always')
  expect(router.options.scrollRestoration).toBe(true)
  expect(router.options.defaultPreload).toBe('intent')
  expect(Object.keys(router.routesByPath)).toContain('/404')
})
