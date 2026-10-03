import { expect, test } from 'bun:test'
import { z } from 'zod'

test('importing it turns zod JIT off, and schemas still parse', async () => {
  await import('./zod-jitless.ts')
  expect(z.config().jitless).toBe(true)
  expect(z.object({ a: z.number() }).parse({ a: 1 })).toEqual({ a: 1 })
})
