// The one bold thing on the site: a real item, as the app shows it, with the
// memorising controls the app has (hide the transliteration, hide the
// translation) and a way to see another dua.
import { type ReactNode, useState } from 'react'
import type { SpecimenDua } from '~/content/specimen'
import { useSite } from '~/i18n/use-site'

interface Thing {
  index: number
  hideTransliteration: boolean
  hideTranslation: boolean
}

const HIDDEN_CLASS = 'pointer-events-none opacity-[0.12] blur-[6px] select-none'
const FADE_CLASS = 'transition-[opacity,filter] duration-[240ms] ease-in-out'

export function Specimen({ duas }: { duas: SpecimenDua[] }): ReactNode {
  const { t } = useSite()
  const [thing, setThing] = useState<Thing>({
    index: 0,
    hideTransliteration: false,
    hideTranslation: false,
  })
  const dua = duas[thing.index]
  if (!dua) return null
  const hasAnyTranslation = duas.some((each) => each.translation !== null)

  function next(): void {
    setThing((previous) => ({ ...previous, index: (previous.index + 1) % duas.length }))
  }

  function toggleTransliteration(): void {
    setThing((previous) => ({ ...previous, hideTransliteration: !previous.hideTransliteration }))
  }

  function toggleTranslation(): void {
    setThing((previous) => ({ ...previous, hideTranslation: !previous.hideTranslation }))
  }

  return (
    <figure
      aria-labelledby="specimen-title"
      className="mt-8 rounded-[1.75rem] rounded-ee-[0.4rem] bg-paper p-[clamp(1.5rem,4vw,2.75rem)] shadow-[0_1px_0_var(--rule),0_30px_60px_-40px_rgba(89,38,22,0.45)]">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h3
          id="specimen-title"
          lang={dua.titleLang ?? undefined}
          className="m-0 font-normal text-[1.05rem] text-ink-soft">
          {dua.title}
        </h3>
        {duas.length > 1 && (
          <button
            type="button"
            onClick={next}
            className="min-h-7 cursor-pointer border-0 bg-transparent px-0 py-1 text-[0.95rem] text-accent underline decoration-1 underline-offset-[0.18em] [font:inherit]">
            {t('home.specimen.next')}
          </button>
        )}
      </div>
      <p
        lang="ar"
        dir="rtl"
        className="mb-5 text-start font-arabic text-[clamp(1.8rem,3.6vw,2.6rem)] text-ink leading-[2]">
        {dua.arabic}
      </p>
      <p
        lang="ar-Latn"
        dir="ltr"
        aria-hidden={thing.hideTransliteration}
        className={`mb-3 font-serif text-ink italic [text-align:match-parent] ${FADE_CLASS} ${thing.hideTransliteration ? HIDDEN_CLASS : ''}`}>
        {dua.transliteration}
      </p>
      {dua.translation !== null && (
        <p
          aria-hidden={thing.hideTranslation}
          className={`mb-6 text-ink-soft ${FADE_CLASS} ${thing.hideTranslation ? HIDDEN_CLASS : ''}`}>
          {dua.translation}
        </p>
      )}
      <p className="m-0 border-rule border-t pt-4 text-[0.95rem] text-ink-soft">
        <strong className="font-normal text-ink">{dua.source}</strong>
        {dua.grading ? ` ${dua.grading}` : ''}
      </p>
      <div className="mt-5 flex flex-wrap gap-[0.6rem]">
        <button
          type="button"
          aria-pressed={thing.hideTransliteration}
          onClick={toggleTransliteration}
          className="rounded-full border border-rule px-4 py-2 text-[0.95rem] text-ink [font:inherit] aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent">
          {t('home.specimen.hideTransliteration')}
        </button>
        {hasAnyTranslation && (
          <button
            type="button"
            aria-pressed={thing.hideTranslation}
            onClick={toggleTranslation}
            className="rounded-full border border-rule px-4 py-2 text-[0.95rem] text-ink [font:inherit] aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent">
            {t('home.specimen.hideTranslation')}
          </button>
        )}
      </div>
    </figure>
  )
}
