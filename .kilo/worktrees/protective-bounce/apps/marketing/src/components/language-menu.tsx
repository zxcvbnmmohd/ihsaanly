// Works without JavaScript: it is a <details>. The effects below only add the
// closing behaviour (click outside, Escape) that the old site.js provided.
import { type ReactNode, useEffect, useRef } from 'react'
import { LOCALE_KEY, LOCALES, pageUrl } from '~/i18n/locales'
import { useSite } from '~/i18n/use-site'
import { storeValue } from './local-storage'

export function LanguageMenu(): ReactNode {
  const { locale, page, a } = useSite()
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function onDocumentClick(event: MouseEvent): void {
      const details = detailsRef.current
      if (details?.open && !details.contains(event.target as Node)) details.open = false
    }
    function onKeyDown(event: KeyboardEvent): void {
      const details = detailsRef.current
      if (event.key === 'Escape' && details?.open) {
        details.open = false
        const summary = details.querySelector('summary')
        if (summary instanceof HTMLElement) summary.focus()
      }
    }
    document.addEventListener('click', onDocumentClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onDocumentClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const path = page?.path ?? ''

  return (
    <details ref={detailsRef} className="group relative">
      <summary className="flex min-h-10 min-w-10 list-none items-center gap-[0.4rem] rounded-full border border-rule px-[0.6rem] py-[0.35rem] text-ink-soft hover:border-current hover:text-ink group-open:border-current group-open:text-ink [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          width="20"
          height="20"
          className="size-5 flex-none">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span className="sr-only">
          {a('common.language.label')}: {locale.name}
        </span>
      </summary>
      <ul className="absolute end-0 top-[calc(100%+0.4rem)] z-30 m-0 min-w-[11rem] max-w-[calc(100vw-2*clamp(1rem,4vw,2.5rem))] list-none rounded-2xl border border-rule bg-paper p-[0.4rem] shadow-[0_20px_40px_-24px_rgba(43,31,26,0.45)]">
        {LOCALES.map((each) => (
          <li key={each.code}>
            <a
              href={pageUrl(each, path)}
              lang={each.lang}
              hrefLang={each.hreflang}
              data-locale={each.code}
              aria-current={each === locale ? 'page' : undefined}
              onClick={() => storeValue(LOCALE_KEY, each.code)}
              className="block rounded-xl px-3 py-[0.45rem] text-start text-base text-ink no-underline hover:bg-tint aria-[current=page]:bg-tint aria-[current=page]:text-accent-ink aria-[current=page]:after:ms-2 aria-[current=page]:after:content-['✓']">
              <span dir={each.dir}>{each.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
