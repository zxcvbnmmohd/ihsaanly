// "This page is available in …", offered once on English pages, to a visitor
// whose browser prefers another supported language. Never redirects, and
// never shown again once a language has been chosen or the banner dismissed.
import { readStored, storeValue } from '@ihsaanly/web/local-storage'
import { type ReactNode, useEffect, useState } from 'react'
import { LOCALE_KEY, LOCALES, type LocaleCode, pageUrl } from '~/i18n/locales'
import { useSite } from '~/i18n/use-site'

// Mirrors resolveLocale in src/i18n/locale.ts: an exact match first, then by
// language. Hong Kong and Macau read as Cantonese; Taiwan stays Mandarin.
const SUPPORTED = [
  'en-CA',
  'en-GB',
  'en-US',
  'ar',
  'fr',
  'it',
  'ja',
  'hi',
  'ur',
  'so',
  'zh-Hans',
  'yue',
]

function languageOf(tag: string): string {
  return tag.split('-')[0] ?? tag
}

function normalise(tag: string): string {
  return /^zh(-Hant)?-(HK|MO)$/i.test(tag) ? 'yue' : tag
}

function resolveLanguage(preferred: readonly string[]): string {
  const tags = preferred.map(normalise)
  const exact = tags.find((tag) => SUPPORTED.includes(tag))
  if (exact) return languageOf(exact)
  for (const tag of tags) {
    const match = SUPPORTED.find((candidate) => languageOf(candidate) === languageOf(tag))
    if (match) return languageOf(match)
  }
  return 'en'
}

export function LocaleSuggestion(): ReactNode {
  const { messages, page } = useSite()
  interface Thing {
    code: LocaleCode | null
  }
  const [thing, setThing] = useState<Thing>({ code: null })
  const { code } = thing

  useEffect(() => {
    if (!messages.offers || readStored(LOCALE_KEY)) return
    const preferred = navigator.languages?.length ? [...navigator.languages] : [navigator.language]
    const resolved = resolveLanguage(preferred.filter(Boolean))
    if (resolved !== 'en' && messages.offers[resolved]) setThing({ code: resolved as LocaleCode })
  }, [messages.offers])

  if (!code) return null
  const offer = messages.offers?.[code]
  const locale = LOCALES.find((each) => each.code === code)
  if (!offer || !locale) return null

  const [before, after = ''] = offer.text.split('{language}')
  const path = page?.path ?? ''

  function dismiss(): void {
    storeValue(LOCALE_KEY, 'en')
    setThing({ code: null })
  }

  return (
    <div
      lang={locale.lang}
      dir={locale.dir}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-[0.35rem] border-rule border-b bg-paper px-[clamp(1rem,4vw,2.5rem)] py-[0.6rem] text-center text-base">
      <p className="m-0">
        {before}
        <a
          href={pageUrl(locale, path)}
          hrefLang={locale.hreflang}
          onClick={() => storeValue(LOCALE_KEY, locale.code)}
          className="text-accent-ink">
          {locale.name}
        </a>
        {after}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="min-h-8 rounded-full border border-rule px-[0.85rem] py-[0.25rem] text-[0.95rem] text-ink-soft [font:inherit]">
        {offer.dismiss}
      </button>
    </div>
  )
}
