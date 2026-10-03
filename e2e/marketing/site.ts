// The marketing site's own copy and locales, read from its source so the
// specs assert on the words the pages actually print.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  LOCALES,
  type Locale,
  type LocaleCode,
  pageUrl,
} from '../../apps/marketing/src/i18n/locales.ts'

export { LOCALES, type Locale, pageUrl }

const MESSAGES = join(
  import.meta.dirname,
  '..',
  '..',
  'apps',
  'marketing',
  'src',
  'i18n',
  'messages',
)

interface Tree {
  [key: string]: string | Tree
}

const cache = new Map<LocaleCode, Tree>()

function messages(code: LocaleCode): Tree {
  let tree = cache.get(code)
  if (!tree) {
    tree = JSON.parse(readFileSync(join(MESSAGES, `${code}.json`), 'utf8')) as Tree
    cache.set(code, tree)
  }
  return tree
}

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** A message as plain text (markup stripped), falling back to English like the site does. */
export function t(key: string, code: LocaleCode = 'en'): string {
  const value = lookup(messages(code), key) ?? lookup(messages('en'), key)
  if (value === undefined) throw new Error(`No message ${key}`)
  return value.replace(/<[^>]+>/g, '')
}

export function locale(code: LocaleCode): Locale {
  const found = LOCALES.find((each) => each.code === code)
  if (!found) throw new Error(`Unknown locale ${code}`)
  return found
}

export const COMPANION_HREF = 'https://companion.ihsaanly.app'
