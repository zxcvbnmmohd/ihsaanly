import type { ReactNode } from 'react'
import type { SpecimenDua } from '~/content/specimen'
import { Demo } from '~/demo'
import { useSite } from '~/i18n/use-site'
import { FaqItem } from './faq-item'
import { WRAP } from './layout-classes'
import { Specimen } from './specimen'
import { StoreBadges } from './store-badges'

const SECTION_CLASS =
  'section grid grid-cols-1 gap-4 pt-[clamp(3rem,7vw,5rem)] min-[52rem]:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] min-[52rem]:gap-[1rem_clamp(2rem,6vw,5rem)]'
const SECTION_TITLE_CLASS =
  'm-0 text-[clamp(1.6rem,2.8vw,2.1rem)] leading-[1.15] font-normal tracking-[-0.01em] text-balance'
const SECTION_BODY_CLASS = 'max-w-[36rem] [&>p:first-child]:mt-0 [&_p]:mb-4 [&_p:last-child]:mb-0'

const DAY_ROWS = ['maghrib', 'isha', 'fajr', 'sunrise', 'dhuhr', 'asr'] as const

function DayTimeline(): ReactNode {
  const { t } = useSite()
  return (
    <ol className="m-0 max-w-[36rem] list-none p-0">
      {DAY_ROWS.map((row) => (
        <li
          key={row}
          className="relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-5 pb-[1.4rem] before:absolute before:start-[5.3rem] before:top-[0.55em] before:size-[0.55rem] before:rounded-full before:border-[1.5px] before:border-accent before:bg-paper before:content-[''] after:absolute after:start-[calc(5.3rem+0.26rem)] after:top-[1.4em] after:bottom-[0.2rem] after:w-px after:bg-rule after:content-[''] first:before:bg-accent last:after:hidden max-[30rem]:grid-cols-1 max-[30rem]:gap-[0.1rem] max-[30rem]:ps-6 max-[30rem]:after:start-[0.26rem] max-[30rem]:before:start-0">
          <span className="text-ink-soft">{t(`home.day.timeline.${row}`)}</span>
          <p className="m-0">{t(`home.day.timeline.${row}What`)}</p>
        </li>
      ))}
    </ol>
  )
}

export function HomePage({ specimen }: { specimen: SpecimenDua[] }): ReactNode {
  const { t } = useSite()

  return (
    <>
      <div
        className={`${WRAP} opening grid grid-cols-1 items-center gap-[clamp(2.5rem,6vw,5.5rem)] pt-[clamp(2rem,6vw,5rem)] pb-[clamp(3rem,8vw,6rem)] min-[52rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]`}>
        <div>
          <h1 className="m-0 mb-6 text-balance font-normal text-[clamp(2.5rem,5.4vw,4.25rem)] leading-[1.04] tracking-[-0.018em]">
            {t('home.hero.title')}
          </h1>
          <p className="lede m-0 mb-8 max-w-[30rem] text-ink-soft text-xl leading-[1.55]">
            {t('home.hero.lede')}
          </p>
          <StoreBadges />
          <p className="m-0 text-base text-ink-soft">{t('home.hero.tryHint')}</p>
        </div>
        <Demo />
      </div>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="day-title">
        <h2 id="day-title" className={SECTION_TITLE_CLASS}>
          {t('home.day.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p>{t('home.day.intro')}</p>
          <p className="text-ink-soft">{t('home.day.maghribFirst')}</p>
          <DayTimeline />
          <p>{t('home.day.outro')}</p>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="source-title">
        <h2 id="source-title" className={SECTION_TITLE_CLASS}>
          {t('home.source.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p>{t('home.source.intro')}</p>
          <p>{t('home.source.plain')}</p>
          <Specimen duas={specimen} />
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="coming-title">
        <h2 id="coming-title" className={SECTION_TITLE_CLASS}>
          {t('home.coming.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p>{t('home.coming.fasting')}</p>
          <p>{t('home.coming.shift')}</p>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="calm-title">
        <h2 id="calm-title" className={SECTION_TITLE_CLASS}>
          {t('home.calm.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p>{t('home.calm.reminders')}</p>
          <p>{t('home.calm.owed')}</p>
          <ul className="mt-1 mb-0 ps-5 [&_li]:mb-[0.35rem]">
            <li>{t('home.calm.neverStreaks')}</li>
            <li>{t('home.calm.neverFailed')}</li>
            <li>{t('home.calm.neverPaywall')}</li>
          </ul>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="inside-title">
        <h2 id="inside-title" className={SECTION_TITLE_CLASS}>
          {t('home.inside.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <ul className="m-0 list-none p-0 [&_li:first-child]:pt-0 [&_li]:border-rule [&_li]:border-b [&_li]:py-[0.7rem]">
            <li>{t('home.inside.adhkar')}</li>
            <li>{t('home.inside.prayers')}</li>
            <li>{t('home.inside.duas')}</li>
            <li>{t('home.inside.fasting')}</li>
            <li>{t('home.inside.text')}</li>
            <li>{t('home.inside.library')}</li>
            <li>{t('home.inside.widgets')}</li>
          </ul>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="private-title">
        <h2 id="private-title" className={SECTION_TITLE_CLASS}>
          {t('home.private.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p className="pledge mb-4 text-[clamp(1.35rem,2.4vw,1.7rem)] leading-[1.35]">
            {t('home.private.pledge')}
          </p>
          <p>{t('home.private.none')}</p>
          <p>{t('home.private.free')}</p>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION_CLASS}`} aria-labelledby="honest-title">
        <h2 id="honest-title" className={SECTION_TITLE_CLASS}>
          {t('home.honest.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <p>{t('home.honest.review')}</p>
          <p>{t('home.honest.languages')}</p>
        </div>
      </section>

      <section
        id="questions"
        className={`${WRAP} ${SECTION_CLASS}`}
        aria-labelledby="questions-title">
        <h2 id="questions-title" className={SECTION_TITLE_CLASS}>
          {t('home.questions.title')}
        </h2>
        <div className={SECTION_BODY_CLASS}>
          <FaqItem question={t('home.questions.timesQ')} answer={t('home.questions.timesA')} />
          <FaqItem question={t('home.questions.hijriQ')} answer={t('home.questions.hijriA')} />
          <FaqItem
            question={t('home.questions.expectedQ')}
            answer={t('home.questions.expectedA')}
          />
          <FaqItem
            question={t('home.questions.locationQ')}
            answer={t('home.questions.locationA')}
          />
          <FaqItem
            question={t('home.questions.notificationsQ')}
            answer={t('home.questions.notificationsA')}
          />
          <FaqItem question={t('home.questions.brokenQ')} answer={t('home.questions.brokenA')} />
        </div>
      </section>
    </>
  )
}
