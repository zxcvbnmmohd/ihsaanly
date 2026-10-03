import { expect, it } from 'bun:test'
import { LAST_MORE_PAGE_KEY, MORE_PATHS } from './last-page'

it('lists the fifteen settings pages, each a top-level path, without duplicates', () => {
  expect(MORE_PATHS).toHaveLength(15)
  expect(new Set(MORE_PATHS).size).toBe(MORE_PATHS.length)
  for (const path of MORE_PATHS) expect(path).toMatch(/^\/[a-z]+$/)
  expect(LAST_MORE_PAGE_KEY).toBe('ihsaanly.more.last')
})
