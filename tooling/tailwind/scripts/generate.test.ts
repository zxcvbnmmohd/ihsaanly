import { expect, spyOn, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTheme, renderWeb } from './render'

const ROOT = join(import.meta.dir, '..')
const read = (name: string): string => readFileSync(join(ROOT, name), 'utf8')

test('generate writes theme.css and web.css exactly as rendered', async () => {
  const log = spyOn(console, 'log').mockImplementation(() => {})
  await import('./generate')
  expect(log).toHaveBeenCalledWith('wrote theme.css and web.css')
  log.mockRestore()
  expect(read('theme.css')).toBe(renderTheme())
  expect(read('web.css')).toBe(renderWeb())
})
