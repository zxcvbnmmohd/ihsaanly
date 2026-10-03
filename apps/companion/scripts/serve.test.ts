import { afterAll, beforeAll, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { preview } from './serve'

const root = mkdtempSync(join(tmpdir(), 'companion-serve-'))
let server: ReturnType<typeof preview>
const saved = process.env.PORT

beforeAll(() => {
  mkdirSync(join(root, 'assets'))
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>door</title>')
  writeFileSync(join(root, 'assets', 'app.js'), 'console.log(1)')
  writeFileSync(
    join(root, 'headers.json'),
    JSON.stringify({
      pages: { '/': "default-src 'self'" },
      fallback: "default-src 'none'",
      headers: { 'X-Test': 'yes' },
    }),
  )
  process.env.PORT = '0'
  server = preview(root)
})

afterAll(() => {
  server.stop(true)
  rmSync(root, { recursive: true, force: true })
  if (saved === undefined) delete process.env.PORT
  else process.env.PORT = saved
})

it('serves the door with its own policy and the headers from headers.json', async () => {
  const response = await fetch(`http://localhost:${server.port}/`)
  expect(await response.text()).toContain('<title>door</title>')
  expect(response.headers.get('content-security-policy')).toBe("default-src 'self'")
  expect(response.headers.get('x-test')).toBe('yes')
})

it('serves a built file as it is', async () => {
  const response = await fetch(`http://localhost:${server.port}/assets/app.js`)
  expect(await response.text()).toBe('console.log(1)')
})

it('answers any other path with index.html (a client route) under the fallback policy', async () => {
  const response = await fetch(`http://localhost:${server.port}/item/dua-leaving-home`)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('<title>door</title>')
  expect(response.headers.get('content-security-policy')).toBe("default-src 'none'")
})
