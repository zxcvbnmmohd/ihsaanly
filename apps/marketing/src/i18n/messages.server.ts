// Server-only: message catalogues are read at build time, merged with English
// and reported on. The client only ever sees one language's merged strings,
// through the static server function in messages.ts.
import type { LocaleCode } from './locales'

export type Strings = Record<string, string>

export interface Catalogue {
  strings: Strings
  missing: string[]
  unknown: string[]
  present: boolean
}

const FILES = import.meta.glob<{ default: unknown }>('./messages/*.json', { eager: true })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNote(key: string): boolean {
  return key === '_comment' || key.endsWith('_comment')
}

function flatten(value: unknown, prefix: string, into: Strings, file: string): Strings {
  if (!isRecord(value)) throw new Error(`${file}: expected an object at "${prefix || '(root)'}"`)
  for (const [key, child] of Object.entries(value)) {
    if (isNote(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') into[path] = child
    else flatten(child, path, into, file)
  }
  return into
}

function readStrings(code: string): Strings | null {
  const file = FILES[`./messages/${code}.json`]
  return file ? flatten(file.default, '', {}, `messages/${code}.json`) : null
}

const ENGLISH = readStrings('en') ?? {}

/** One language's strings laid over English, with what it lacks and what English does not know. */
export function merge(english: Strings, own: Strings | null, code: string): Catalogue {
  const strings: Strings = {}
  const missing: string[] = []
  for (const [key, value] of Object.entries(english)) {
    const translated = own?.[key]
    if (translated === undefined || translated.trim() === '') {
      if (code !== 'en') missing.push(key)
      strings[key] = value
    } else {
      strings[key] = translated
    }
  }
  const unknown = own ? Object.keys(own).filter((key) => !(key in english)) : []
  return { strings, missing, unknown, present: own !== null }
}

export function catalogue(code: LocaleCode): Catalogue {
  return merge(ENGLISH, code === 'en' ? ENGLISH : readStrings(code), code)
}
