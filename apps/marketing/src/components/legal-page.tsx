import type { ReactNode } from 'react'
import { BUSINESS } from '~/i18n/locales'
import { useSite } from '~/i18n/use-site'
import { WRAP } from './layout-classes'

const H2_CLASS = 'mt-11 mb-3 text-[1.55rem] leading-[1.2] font-normal'
const P_CLASS = '[&_p]:mb-[0.9rem] [&_li]:mb-[0.9rem]'
const UL_CLASS = 'mb-4 ps-5'
const OL_CLASS = 'mb-4 list-decimal ps-5'

type LegalPageId = 'privacy' | 'terms' | 'deleteAccount'

/** A heading followed by one paragraph per key. */
function Section({ title, keys }: { title: string; keys: readonly string[] }): ReactNode {
  const { t } = useSite()
  return (
    <>
      <h2 className={H2_CLASS}>{t(title)}</h2>
      {keys.map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </>
  )
}

function List({
  keys,
  ordered = false,
}: {
  keys: readonly string[]
  ordered?: boolean
}): ReactNode {
  const { t } = useSite()
  const items = keys.map((key) => <li key={key}>{t(key)}</li>)
  return ordered ? <ol className={OL_CLASS}>{items}</ol> : <ul className={UL_CLASS}>{items}</ul>
}

/** The publisher's details. Province and address appear only once they are known. */
function Business(): ReactNode {
  const { t } = useSite()
  return (
    <p>
      {BUSINESS.name}
      <br />
      {BUSINESS.address && (
        <>
          {BUSINESS.address}
          <br />
        </>
      )}
      {BUSINESS.province && `${BUSINESS.province}, `}
      {t('common.country')}
      <br />
      <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
    </p>
  )
}

function PrivacyBody(): ReactNode {
  const { t } = useSite()
  return (
    <div className={P_CLASS}>
      <Section title="privacy.scopeTitle" keys={['privacy.scopeText']} />

      <h2 className={H2_CLASS}>{t('privacy.storedTitle')}</h2>
      <List
        keys={[
          'privacy.storedMarks',
          'privacy.storedCompleted',
          'privacy.storedOwed',
          'privacy.storedDay',
          'privacy.storedSuggested',
          'privacy.storedTravel',
          'privacy.storedGender',
          'privacy.storedSettings',
          'privacy.storedHome',
        ]}
      />
      <p>{t('privacy.storedWhere')}</p>
      <p>{t('privacy.contentUpdates')}</p>

      <Section
        title="privacy.locationTitle"
        keys={['privacy.locationRough', 'privacy.locationNever', 'privacy.locationGeofence']}
      />

      <h2 className={H2_CLASS}>{t('privacy.syncTitle')}</h2>
      <p>{t('privacy.syncIntro')}</p>
      <List
        keys={[
          'privacy.syncIdentity',
          'privacy.syncId',
          'privacy.syncRecord',
          'privacy.syncProgress',
          'privacy.syncSettings',
        ]}
      />
      <p>{t('privacy.syncNot')}</p>

      <Section
        title="privacy.processorsTitle"
        keys={[
          'privacy.processorsText',
          'privacy.processorsTransfer',
          'privacy.processorsSecurity',
        ]}
      />

      <h2 className={H2_CLASS}>{t('privacy.basesTitle')}</h2>
      <p>{t('privacy.basesIntro')}</p>
      <List
        keys={[
          'privacy.basesContract',
          'privacy.basesConsent',
          'privacy.basesInterests',
          'privacy.basesFeedback',
        ]}
      />
      <p>{t('privacy.basesDevice')}</p>

      <Section title="privacy.sensitiveTitle" keys={['privacy.sensitiveText']} />

      <Section
        title="privacy.leaveTitle"
        keys={[
          'privacy.leaveTwo',
          'privacy.leaveExport',
          'privacy.leaveReport',
          'privacy.leaveFeedback',
          'privacy.leaveReceive',
        ]}
      />

      <h2 className={H2_CLASS}>{t('privacy.feedbackTitle')}</h2>
      <p>{t('privacy.feedbackIntro')}</p>
      <List
        keys={[
          'privacy.feedbackMessage',
          'privacy.feedbackContact',
          'privacy.feedbackApp',
          'privacy.feedbackAccount',
          'privacy.feedbackDiagnostics',
        ]}
      />
      <p>{t('privacy.feedbackPurpose')}</p>
      <p>{t('privacy.feedbackAccess')}</p>
      <p>{t('privacy.feedbackRetention')}</p>

      <h2 className={H2_CLASS}>{t('privacy.notTitle')}</h2>
      <List
        keys={[
          'privacy.notAccount',
          'privacy.notAds',
          'privacy.notAnalytics',
          'privacy.notTracking',
          'privacy.notSelling',
        ]}
      />

      <Section
        title="privacy.retentionTitle"
        keys={[
          'privacy.retentionText',
          'privacy.retentionDelete',
          'privacy.retentionFeedback',
          'privacy.retentionSignOut',
        ]}
      />

      <h2 className={H2_CLASS}>{t('privacy.rightsTitle')}</h2>
      <p>{t('privacy.rightsIntro')}</p>
      <List
        keys={[
          'privacy.rightsAccess',
          'privacy.rightsRectify',
          'privacy.rightsErase',
          'privacy.rightsFeedback',
          'privacy.rightsRestrict',
          'privacy.rightsWithdraw',
          'privacy.rightsComplain',
        ]}
      />
      <p>{t('privacy.rightsHow')}</p>

      <Section
        title="privacy.californiaTitle"
        keys={[
          'privacy.californiaCollected',
          'privacy.californiaPurpose',
          'privacy.californiaNoSale',
        ]}
      />

      <Section title="privacy.childrenTitle" keys={['privacy.childrenText']} />

      <Section
        title="privacy.siteTitle"
        keys={[
          'privacy.siteText',
          'privacy.siteStorage',
          'privacy.siteApp',
          'privacy.siteNecessary',
        ]}
      />

      <Section
        title="privacy.donationsTitle"
        keys={['privacy.donationsFree', 'privacy.donationsOptional']}
      />

      <Section
        title="privacy.deleteTitle"
        keys={['privacy.deleteText', 'privacy.deleteAccountText']}
      />

      <Section title="privacy.changesTitle" keys={['privacy.changesText']} />

      <Section title="privacy.contactTitle" keys={['privacy.contactText']} />
      <Business />
    </div>
  )
}

function TermsBody(): ReactNode {
  const { t } = useSite()
  return (
    <div className={P_CLASS}>
      <Section title="terms.whoTitle" keys={['terms.whoText']} />
      <Section title="terms.useTitle" keys={['terms.useLicence', 'terms.useCopy']} />
      <Section
        title="terms.religiousTitle"
        keys={['terms.religiousGuide', 'terms.religiousReview']}
      />
      <Section title="terms.datesTitle" keys={['terms.datesText']} />
      <Section title="terms.accountsTitle" keys={['terms.accountsText', 'terms.accountsEnd']} />
      <Section title="terms.dataTitle" keys={['terms.dataText']} />
      <Section title="terms.donationsTitle" keys={['terms.donationsText']} />
      <Section title="terms.storesTitle" keys={['terms.storesText']} />
      <Section title="terms.warrantyTitle" keys={['terms.warrantyText']} />
      <Section title="terms.liabilityTitle" keys={['terms.liabilityText']} />
      <Section title="terms.changesTitle" keys={['terms.changesText']} />

      <h2 className={H2_CLASS}>{t('terms.lawTitle')}</h2>
      <p>{t(BUSINESS.province ? 'terms.lawProvince' : 'terms.lawText')}</p>

      <h2 className={H2_CLASS}>{t('terms.contactTitle')}</h2>
      <Business />
    </div>
  )
}

function DeleteAccountBody(): ReactNode {
  const { t } = useSite()
  return (
    <div className={P_CLASS}>
      <p>{t('deleteAccount.noAccount')}</p>

      <h2 className={H2_CLASS}>{t('deleteAccount.appTitle')}</h2>
      <p>{t('deleteAccount.appIntro')}</p>
      <List
        ordered
        keys={[
          'deleteAccount.appStep1',
          'deleteAccount.appStep2',
          'deleteAccount.appStep3',
          'deleteAccount.appStep4',
        ]}
      />
      <p>{t('deleteAccount.appAfter')}</p>

      <Section title="deleteAccount.emailTitle" keys={['deleteAccount.emailText']} />

      <h2 className={H2_CLASS}>{t('deleteAccount.deletedTitle')}</h2>
      <List
        keys={[
          'deleteAccount.deletedRecord',
          'deleteAccount.deletedSettings',
          'deleteAccount.deletedAccount',
        ]}
      />
      <p>{t('deleteAccount.deletedBackups')}</p>

      <h2 className={H2_CLASS}>{t('deleteAccount.keptTitle')}</h2>
      <List
        keys={[
          'deleteAccount.keptDevices',
          'deleteAccount.keptFeedback',
          'deleteAccount.keptDonations',
        ]}
      />
      <p>{t('deleteAccount.privacyLink')}</p>

      <h2 className={H2_CLASS}>{t('deleteAccount.contactTitle')}</h2>
      <Business />
    </div>
  )
}

const SUMMARY: Record<LegalPageId, readonly string[]> = {
  privacy: ['privacy.summaryDevice', 'privacy.summarySync', 'privacy.summaryFeedback'],
  terms: ['terms.summaryFree', 'terms.summaryMistakes'],
  deleteAccount: ['deleteAccount.summaryApp', 'deleteAccount.summaryEmail'],
}

const BODY: Record<LegalPageId, () => ReactNode> = {
  privacy: PrivacyBody,
  terms: TermsBody,
  deleteAccount: DeleteAccountBody,
}

export function LegalPage({ page }: { page: LegalPageId }): ReactNode {
  const { locale, page: current, t } = useSite()
  const showsGovernance = Boolean(current?.updated) && locale.code !== 'en'
  const Body = BODY[page]

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
          {SUMMARY[page].map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <Body />
      </article>
    </div>
  )
}
