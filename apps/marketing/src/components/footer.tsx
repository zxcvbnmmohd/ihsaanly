import { APP_LINKS } from '@ihsaanly/web/app-links'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { WRAP } from './layout-classes'

export function Footer(): ReactNode {
  const { locale, page, links, t, a } = useSite()
  const params = { lang: locale.code === 'en' ? undefined : locale.code }
  return (
    <footer
      className={`${WRAP} mt-[clamp(4rem,10vw,7rem)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 border-rule border-t pt-8 pb-12 text-[0.95rem] text-ink-soft`}>
      <p className="m-0">{t('common.footer.copyright')}</p>
      <nav aria-label={a('common.footer.label')} className="flex flex-wrap gap-5">
        <Link
          to="/{-$lang}/"
          params={params}
          hash="questions"
          className="text-ink-soft no-underline hover:text-ink">
          {t('common.footer.support')}
        </Link>
        <Link
          to="/{-$lang}/legal/privacy/"
          params={params}
          aria-current={page?.id === 'privacy' ? 'page' : undefined}
          className="text-ink-soft no-underline hover:text-ink aria-[current=page]:text-ink">
          {t('common.footer.privacy')}
        </Link>
        <Link
          to="/{-$lang}/legal/terms/"
          params={params}
          aria-current={page?.id === 'terms' ? 'page' : undefined}
          className="text-ink-soft no-underline hover:text-ink aria-[current=page]:text-ink">
          {t('common.footer.terms')}
        </Link>
        <Link
          to="/{-$lang}/legal/delete-account/"
          params={params}
          aria-current={page?.id === 'deleteAccount' ? 'page' : undefined}
          className="text-ink-soft no-underline hover:text-ink aria-[current=page]:text-ink">
          {t('common.footer.deleteAccount')}
        </Link>
        <a href={links.companion} className="text-ink-soft no-underline hover:text-ink">
          {t('common.footer.webApp')}
        </a>
        {APP_LINKS.chromeWebStoreUrl ? (
          <a
            href={APP_LINKS.chromeWebStoreUrl}
            className="text-ink-soft no-underline hover:text-ink">
            {t('common.footer.extension')}
          </a>
        ) : null}
        <a href={links.donate} className="text-ink-soft no-underline hover:text-ink">
          {t('common.footer.donate')}
        </a>
        <a href={links.email} className="text-ink-soft no-underline hover:text-ink">
          support@ihsaanly.app
        </a>
      </nav>
    </footer>
  )
}
