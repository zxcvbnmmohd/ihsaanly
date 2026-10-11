import { afterEach, beforeEach, expect, it } from 'bun:test'

import { applyDirection } from './direction.web'

const root = { lang: '', dir: '' }

beforeEach(() => {
  ;(globalThis as unknown as { document: unknown }).document = { documentElement: root }
})

afterEach(() => {
  delete (globalThis as { document?: unknown }).document
})

it('sets lang and a right-to-left dir on the page for Arabic', () => {
  applyDirection('ar')
  expect(root).toEqual({ lang: 'ar', dir: 'rtl' })
})

it('sets left-to-right for a left-to-right locale', () => {
  applyDirection('en-GB')
  expect(root).toEqual({ lang: 'en-GB', dir: 'ltr' })
})
