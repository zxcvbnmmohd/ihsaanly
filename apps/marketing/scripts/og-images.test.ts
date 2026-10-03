import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brand, fonts } from '@ihsaanly/tailwind/tokens'
import { LOCALES, localeFor } from '../src/i18n/locales.ts'
import { flatten, page, renderImages, stack, strings, text } from './og-images.ts'

describe('flatten', () => {
  test('joins nested keys and skips notes', () => {
    expect(flatten({ a: { b: 'x', b_comment: 'n' }, _comment: 'n', c: 'y' })).toEqual({
      'a.b': 'x',
      c: 'y',
    })
  })
})

describe('strings', () => {
  test('is the language laid over English', () => {
    const french = strings('fr')
    expect(french['home.hero.title']).toBeTruthy()
    expect(french['home.hero.title']).not.toBe(strings('en')['home.hero.title'])
    expect(Object.keys(french).length).toBe(Object.keys(strings('en')).length)
  })
})

describe('text', () => {
  test('drops tags and escapes what could be markup', () => {
    expect(text('a <strong>b</strong> & c < d')).toBe('a b &amp; c &lt; d')
  })

  test('nothing is empty', () => {
    expect(text(undefined)).toBe('')
  })
})

describe('stack', () => {
  test.each([
    ['ar', fonts.arabic.web],
    ['ur', fonts.urdu.web],
    ['ja', fonts.japanese.web],
    ['hi', fonts.devanagari.web],
    ['zh', fonts['chinese-hans'].web],
    ['yue', fonts['chinese-hant'].web],
    ['en', fonts.serif.web],
    ['fr', fonts.serif.web],
  ] as const)('%s uses its own font stack', (code, expected) => {
    expect(stack(localeFor(code))).toBe(expected)
  })
})

describe('page', () => {
  test('an English page is left to right, titled and sized for a share card', () => {
    const html = page(localeFor('en'))
    expect(html).toContain('<html lang="en" dir="ltr">')
    expect(html).toContain('width: 1200px; height: 630px')
    expect(html).toContain(brand.accent.light)
    expect(html).toContain(text(strings('en')['home.hero.title']))
    expect(html).toContain('.brand { position: absolute; top: 78px; left: 88px')
  })

  test('a right-to-left page mirrors the layout', () => {
    const html = page(localeFor('ar'))
    expect(html).toContain('<html lang="ar" dir="rtl">')
    expect(html).toContain('.brand { position: absolute; top: 78px; right: 88px')
    expect(html).toContain(fonts.arabic.web)
  })

  test('every language renders', () => {
    for (const locale of LOCALES) expect(page(locale)).toContain(`lang="${locale.lang}"`)
  })
})

describe('renderImages', () => {
  let dir = ''
  let log: ReturnType<typeof spyOn>
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'og-'))
    log = spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    log.mockRestore()
    rmSync(dir, { recursive: true, force: true })
  })

  test('writes a page per locale and asks Chrome to screenshot each to its PNG', () => {
    const calls: { command: string; args: string[] }[] = []
    const written = renderImages({
      chrome: '/chrome',
      out: join(dir, 'out'),
      work: join(dir, 'work'),
      locales: [localeFor('en'), localeFor('ar')],
      run: (command, args) => {
        calls.push({ command, args })
        return { status: 0 }
      },
    })
    expect(written).toEqual([join(dir, 'out', 'og-en.png'), join(dir, 'out', 'og-ar.png')])
    expect(calls.map((call) => call.command)).toEqual(['/chrome', '/chrome'])
    expect(calls[1]?.args).toContain(`--screenshot=${join(dir, 'out', 'og-ar.png')}`)
    expect(calls[1]?.args).toContain(`file://${join(dir, 'work', 'og-ar.html')}`)
    expect(calls[0]?.args).toContain('--window-size=1200,630')
    expect(readFileSync(join(dir, 'work', 'og-ar.html'), 'utf8')).toBe(page(localeFor('ar')))
    expect(existsSync(join(dir, 'work', 'og-en.html'))).toBe(true)
    expect(log).toHaveBeenCalledWith(`wrote ${join(dir, 'out', 'og-en.png')}`)
  })

  test('stops with the reason when Chrome fails', () => {
    expect(() =>
      renderImages({
        chrome: '/chrome',
        out: dir,
        work: dir,
        locales: [localeFor('fr')],
        run: () => ({ status: 1, stderr: 'no display' }),
      }),
    ).toThrow('Chrome failed for fr: no display')
  })
})
