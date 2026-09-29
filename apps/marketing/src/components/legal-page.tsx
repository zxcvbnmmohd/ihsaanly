import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { WRAP } from './layout-classes'

const H2_CLASS = 'mt-11 mb-3 text-[1.55rem] leading-[1.2] font-normal'
const P_CLASS = '[&_p]:mb-[0.9rem] [&_li]:mb-[0.9rem]'
const UL_CLASS = 'mb-4 ps-5'

function PrivacyBody(): ReactNode {
  const { t } = useSite()
  return (
    <div className={P_CLASS}>
      <h2 className={H2_CLASS}>{t('privacy.storedTitle')}</h2>
      <ul className={UL_CLASS}>
        <li>{t('privacy.storedMarks')}</li>
        <li>{t('privacy.storedCompleted')}</li>
        <li>{t('privacy.storedOwed')}</li>
        <li>{t('privacy.storedDay')}</li>
        <li>{t('privacy.storedSuggested')}</li>
        <li>{t('privacy.storedTravel')}</li>
        <li>{t('privacy.storedGender')}</li>
        <li>{t('privacy.storedSettings')}</li>
        <li>{t('privacy.storedHome')}</li>
      </ul>
      <p>{t('privacy.storedWhere')}</p>

      <h2 className={H2_CLASS}>{t('privacy.locationTitle')}</h2>
      <p>{t('privacy.locationRough')}</p>
      <p>{t('privacy.locationNever')}</p>
      <p>{t('privacy.locationGeofence')}</p>

      <h2 className={H2_CLASS}>{t('privacy.leaveTitle')}</h2>
      <p>{t('privacy.leaveTwo')}</p>
      <p>{t('privacy.leaveExport')}</p>
      <p>{t('privacy.leaveReport')}</p>
      <p>{t('privacy.leaveReceive')}</p>

      <h2 className={H2_CLASS}>{t('privacy.donationsTitle')}</h2>
      <p>{t('privacy.donationsFree')}</p>
      <p>{t('privacy.donationsOptional')}</p>

      <h2 className={H2_CLASS}>{t('privacy.notTitle')}</h2>
      <ul className={UL_CLASS}>
        <li>{t('privacy.notAccount')}</li>
        <li>{t('privacy.notAds')}</li>
        <li>{t('privacy.notAnalytics')}</li>
        <li>{t('privacy.notTracking')}</li>
        <li>{t('privacy.notSelling')}</li>
      </ul>

      <h2 className={H2_CLASS}>{t('privacy.siteTitle')}</h2>
      <p>{t('privacy.siteText')}</p>
      <p>{t('privacy.siteStorage')}</p>

      <h2 className={H2_CLASS}>{t('privacy.childrenTitle')}</h2>
      <p>{t('privacy.childrenText')}</p>

      <h2 className={H2_CLASS}>{t('privacy.deleteTitle')}</h2>
      <p>{t('privacy.deleteText')}</p>

      <h2 className={H2_CLASS}>{t('privacy.contactTitle')}</h2>
      <p>
        Mohd Inc.
        <br />
        <a href="mailto:support@ihsaanly.app">support@ihsaanly.app</a>
      </p>
    </div>
  )
}

function TermsBody(): ReactNode {
  const { t } = useSite()
  return (
    <div className={P_CLASS}>
      <h2 className={H2_CLASS}>{t('terms.whoTitle')}</h2>
      <p>{t('terms.whoText')}</p>

      <h2 className={H2_CLASS}>{t('terms.useTitle')}</h2>
      <p>{t('terms.useLicence')}</p>
      <p>{t('terms.useCopy')}</p>

      <h2 className={H2_CLASS}>{t('terms.religiousTitle')}</h2>
      <p>{t('terms.religiousGuide')}</p>
      <p>{t('terms.religiousReview')}</p>

      <h2 className={H2_CLASS}>{t('terms.datesTitle')}</h2>
      <p>{t('terms.datesText')}</p>

      <h2 className={H2_CLASS}>{t('terms.dataTitle')}</h2>
      <p>{t('terms.dataText')}</p>

      <h2 className={H2_CLASS}>{t('terms.donationsTitle')}</h2>
      <p>{t('terms.donationsText')}</p>

      <h2 className={H2_CLASS}>{t('terms.storesTitle')}</h2>
      <p>{t('terms.storesText')}</p>

      <h2 className={H2_CLASS}>{t('terms.warrantyTitle')}</h2>
      <p>{t('terms.warrantyText')}</p>

      <h2 className={H2_CLASS}>{t('terms.liabilityTitle')}</h2>
      <p>{t('terms.liabilityText')}</p>

      <h2 className={H2_CLASS}>{t('terms.changesTitle')}</h2>
      <p>{t('terms.changesText')}</p>

      <h2 className={H2_CLASS}>{t('terms.lawTitle')}</h2>
      <p>{t('terms.lawText')}</p>

      <h2 className={H2_CLASS}>{t('terms.contactTitle')}</h2>
      <p>
        Mohd Inc.
        <br />
        <a href="mailto:support@ihsaanly.app">support@ihsaanly.app</a>
      </p>
    </div>
  )
}

export function LegalPage({ page }: { page: 'privacy' | 'terms' }): ReactNode {
  const { locale, page: current, t } = useSite()
  const showsGovernance = Boolean(current?.updated) && locale.code !== 'en'

  return (
    <div className={WRAP}>
      <article className="legal max-w-[40rem] pt-[clamp(1.5rem,5vw,3.5rem)]">
        <h1 className="mb-2 font-normal text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.08] tracking-[-0.015em]">
          {t(`${page}.title`)}
        </h1>
        <p className="mb-10 text-ink-soft">{t(`${page}.meta`)}</p>
        {showsGovernance && (
          <p className="-mt-6 mb-10 text-[0.95rem] text-ink-soft">{t('common.governs')}</p>
        )}
        <div className="summary mb-10 rounded-[1.25rem] rounded-ee-[0.35rem] bg-paper p-[1.5rem_1.75rem] text-xl leading-[1.55] [&_p:last-child]:mb-0 [&_p]:mb-3">
          {page === 'privacy' ? (
            <>
              <p>{t('privacy.summaryAccount')}</p>
              <p>{t('privacy.summaryNothing')}</p>
            </>
          ) : (
            <>
              <p>{t('terms.summaryFree')}</p>
              <p>{t('terms.summaryMistakes')}</p>
            </>
          )}
        </div>
        {page === 'privacy' ? <PrivacyBody /> : <TermsBody />}
      </article>
    </div>
  )
}
