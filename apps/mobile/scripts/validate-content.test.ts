import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import * as translations from '@ihsaanly/core/content/translations'
import * as validate from '@ihsaanly/core/content/validate'
import { main } from './validate-content'

const run = (): void => main()

const logged: string[] = []
const warned: string[] = []
const errored: string[] = []
const exits: (number | undefined)[] = []

beforeEach(() => {
  logged.length = warned.length = errored.length = exits.length = 0
  spyOn(console, 'log').mockImplementation((...args) => void logged.push(args.join(' ')))
  spyOn(console, 'warn').mockImplementation((...args) => void warned.push(args.join(' ')))
  spyOn(console, 'error').mockImplementation((...args) => void errored.push(args.join(' ')))
  spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code)
  }) as never)
})
afterEach(() => mock.restore())

describe('validate-content', () => {
  it('passes on the shipped content and reports the item count', async () => {
    run()
    expect(exits).toEqual([])
    expect(errored).toEqual([])
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatch(/^✔ content\/items\.json valid — \d+ items?$/)
  })

  it('warns about validator warnings and about languages missing strings', async () => {
    spyOn(validate, 'validateContentDocument').mockImplementation(
      (document) =>
        ({
          valid: true,
          document,
          warnings: ['a soft warning'],
          problems: [],
        }) as never,
    )
    spyOn(translations, 'missingIn').mockImplementation(((_: unknown, language: string) =>
      language === 'ar' ? ['one', 'two'] : []) as never)
    run()
    expect(warned).toContain('⚠ a soft warning')
    expect(warned.some((line) => line.startsWith('⚠ ar is missing 2 strings: one, two'))).toBe(true)
    expect(warned.some((line) => line.startsWith('⚠ fr is missing'))).toBe(false)
    expect(exits).toEqual([])
  })

  it('exits non-zero listing every problem when the document is invalid', async () => {
    spyOn(validate, 'validateContentDocument').mockImplementation((() => ({
      valid: false,
      problems: ['items.0: bad id'],
      warnings: [],
    })) as never)
    run()
    expect(exits).toEqual([1])
    expect(errored[0]).toContain('✖ content is invalid (1 problems)')
    expect(errored).toContain('  items.0: bad id')
    expect(logged).toEqual([])
  })

  it('reports translation files with the wrong shape or with items that do not exist', async () => {
    const files = await import('@ihsaanly/core/content/translation-files')
    const original = [...files.translationFiles]
    files.translationFiles.splice(
      0,
      files.translationFiles.length,
      { language: 'fr', items: { 'no-such-item': {} } } as never,
      { language: 'it', items: 'nope' } as never,
    )
    try {
      run()
    } finally {
      files.translationFiles.splice(0, files.translationFiles.length, ...original)
    }
    expect(exits).toEqual([1])
    expect(errored).toContain('  translations/fr: no item "no-such-item"')
    expect(errored.some((line) => line.startsWith('  translations/it: items'))).toBe(true)
  })
})
