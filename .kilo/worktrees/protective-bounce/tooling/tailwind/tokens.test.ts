import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTheme, renderWeb } from './scripts/render'
import { brand, palettes } from './tokens'

test('theme.css and web.css match tokens.ts (run `bun run generate`)', () => {
  expect(readFileSync(join(import.meta.dir, 'theme.css'), 'utf8')).toBe(renderTheme())
  expect(readFileSync(join(import.meta.dir, 'web.css'), 'utf8')).toBe(renderWeb())
})

test('the JavaScript palette is built from the same brand colours', () => {
  expect(palettes.light.accent).toBe(brand.accent.light)
  expect(palettes.dark.wash).toEqual([brand['wash-top'].dark, brand['wash-bottom'].dark])
  expect(palettes.dark.widgetSurface).toBe(brand.paper.dark)
})
