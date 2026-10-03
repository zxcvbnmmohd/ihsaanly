import { expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

it('regenerates src/widgets/sample.json exactly as committed', async () => {
  // The script writes a path relative to the app, so run it from a scratch copy of the tree.
  const scratch = mkdtempSync(join(tmpdir(), 'widget-sample-'))
  mkdirSync(join(scratch, 'src/widgets'), { recursive: true })
  const cwd = process.cwd()
  process.chdir(scratch)
  try {
    await import('./widget-sample')
  } finally {
    process.chdir(cwd)
  }
  const written = readFileSync(join(scratch, 'src/widgets/sample.json'), 'utf8')
  const committed = readFileSync(join(import.meta.dir, '../src/widgets/sample.json'), 'utf8')
  expect(written).toBe(committed)
  expect(written.endsWith('}\n')).toBe(true)
})
