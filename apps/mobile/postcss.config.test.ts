import { expect, it } from 'bun:test'
import config from './postcss.config.mjs'

it('runs Tailwind through its PostCSS plugin and nothing else', () => {
  expect(config).toEqual({ plugins: { '@tailwindcss/postcss': {} } })
})
