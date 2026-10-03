import { expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * The sample's dates are formatted by the runtime's ICU data, whose CLDR
 * version decides small abbreviations (en-GB "Sep" on macOS, "Sept" on newer
 * Linux builds). Those differences are the platform's, not the model's, so
 * month abbreviations are normalised before comparing.
 */
function normaliseMonths(json: string): string {
  return json.replace(/\bSept\b/g, 'Sep')
}

it('regenerates src/widgets/sample.json as committed (up to ICU month abbreviations)', async () => {
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
  expect(normaliseMonths(written)).toBe(normaliseMonths(committed))
  expect(written.endsWith('}\n')).toBe(true)
})
