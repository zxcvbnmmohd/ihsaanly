import { describe, expect, it } from 'bun:test'

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n/locale'

import { ar } from './ar'
import { en, type Strings } from './en'
import { fr } from './fr'
import { hi } from './hi'
import { it as italian } from './it'
import { ja } from './ja'
import { so } from './so'
import { ur } from './ur'
import { yue } from './yue'
import { zh } from './zh'

const TABLES: Record<SupportedLanguage, Strings> = {
  en,
  ar,
  fr,
  hi,
  it: italian,
  ja,
  so,
  ur,
  yue,
  zh,
}

type Leaf = string | ((...args: never[]) => string)

/** Every string and function in a table, keyed by dotted path. */
function leaves(node: unknown, path = ''): Map<string, Leaf> {
  const out = new Map<string, Leaf>()
  if (typeof node === 'string' || typeof node === 'function') {
    out.set(path, node as Leaf)
    return out
  }
  if (Array.isArray(node)) {
    node.forEach((value, index) => {
      leaves(value, `${path}.${index}`).forEach((leaf, key) => out.set(key, leaf))
    })
    return out
  }
  if (node !== null && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      leaves(value, path ? `${path}.${key}` : key).forEach((leaf, k) => out.set(k, leaf))
    })
    return out
  }
  throw new Error(`Unexpected ${typeof node} at ${path}`)
}

const placeholders = (text: string): string[] => (text.match(/(?<!\$)\{[A-Za-z]+\}/g) ?? []).sort()

const english = leaves(en)

/** Arguments for each function, by the parameter list of the English one. */
const STRING_PARAMS = new Set([
  'closes',
  'date',
  'email',
  'existing',
  'attempted',
  'grader',
  'month',
  'name',
  'permission',
  'provider',
  'when',
])

function paramNames(fn: Leaf): string[] {
  const source = fn.toString()
  const match = /^[^(]*\(([^)]*)\)/.exec(source)
  return (match?.[1] ?? '')
    .split(',')
    .map((param) => param.trim())
    .filter(Boolean)
}

function callWith(
  fn: Leaf,
  names: string[],
  n: number,
): { text: string; args: (string | number)[] } {
  const args = names.map((name, index) =>
    STRING_PARAMS.has(name) ? `ARG${index}` : n + index * 100,
  )
  return { text: (fn as (...a: (string | number)[]) => string)(...args), args }
}

describe('the English table', () => {
  it('has no empty strings', () => {
    english.forEach((leaf, path) => {
      if (typeof leaf === 'string') expect(leaf.trim(), path).not.toBe('')
    })
  })

  it('has functions for the parameterised copy', () => {
    const fns = [...english.values()].filter((leaf) => typeof leaf === 'function')
    expect(fns.length).toBeGreaterThan(30)
  })
})

describe.each([...SUPPORTED_LANGUAGES])('the %s table', (language) => {
  const table = leaves(TABLES[language])

  it('has exactly the keys of English', () => {
    expect([...table.keys()].sort()).toEqual([...english.keys()].sort())
  })

  it('has no empty strings and keeps every {placeholder} of the English text', () => {
    english.forEach((leaf, path) => {
      const own = table.get(path)
      if (typeof leaf === 'string') {
        expect(typeof own, path).toBe('string')
        expect((own as string).trim(), path).not.toBe('')
        expect(placeholders(own as string), path).toEqual(placeholders(leaf))
      } else {
        expect(typeof own, path).toBe('function')
      }
    })
  })

  it('formats every function with its arguments, for counts of every size', () => {
    english.forEach((leaf, path) => {
      if (typeof leaf !== 'function') return
      const own = table.get(path) as Leaf
      const names = paramNames(leaf)
      expect(paramNames(own).length, path).toBe(names.length)

      ;[0, 1, 2, 3, 5, 10, 11, 25, 100].forEach((n) => {
        const { text, args } = callWith(own, names, n)
        expect(typeof text, path).toBe('string')
        expect(text.trim(), path).not.toBe('')
        expect(text, path).not.toMatch(/undefined|NaN|\[object/)
        // String arguments are always shown; numbers may be spelled out for 1 and 2.
        args.forEach((arg) => {
          if (typeof arg === 'string' || n >= 3)
            expect(text, `${path}(${n})`).toContain(String(arg))
        })
      })
    })
  })
})

describe('the English functions', () => {
  it('pluralise counts', () => {
    expect(en.fasting.summary(1)).toBe('1 fast to make up')
    expect(en.fasting.summary(3)).toBe('3 fasts to make up')
    expect(en.qada.summary(1)).toBe('1 prayer owed')
    expect(en.qada.summary(4)).toBe('4 prayers owed')
    expect(en.hijri.offsetLabel(0)).toBe('No change')
    expect(en.hijri.offsetLabel(1)).toBe('+1 day')
    expect(en.hijri.offsetLabel(-2)).toBe('-2 days')
  })

  it('splices string arguments in', () => {
    expect(en.hijri.format(5, 'Rabiʿ', 1448)).toBe('5 Rabiʿ 1448')
    expect(en.account.linkProvider('Google')).toBe('Link Google')
  })
})
