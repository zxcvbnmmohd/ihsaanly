import { BrandMark } from '@ihsaanly/web/icons'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { COMPANION_URL } from '~/links'
import { LanguageMenu } from './language-menu'
import { WRAP } from './layout-classes'
import { ThemeToggle } from './theme-toggle'

export function Header(): ReactNode {
  const { locale, a, t } = useSite()
  return (
    <header className={`${WRAP} flex items-center justify-between gap-4 py-6`}>
      <Link
        to="/{-$lang}/"
        params={{ lang: locale.code === 'en' ? undefined : locale.code }}
        aria-label={a('common.brandHome')}
        className="brand inline-flex items-center gap-[0.6rem] font-serif text-ink text-xl tracking-[0.01em] no-underline">
        <BrandMark className="size-[1.9rem] text-accent" />
        {/* Below 26rem the wordmark yields its room to the header button,
            which names the app anyway; the link keeps its spoken label. */}
        <span className="max-[26rem]:sr-only">Ihsaanly</span>
      </Link>
      <div className="flex items-center gap-[0.35rem]">
        {/* The one filled control on the page: the web app is the only surface
            live today, so it is the primary call to action on every page. */}
        <a
          href={COMPANION_URL}
          className="me-[0.4rem] inline-flex min-h-10 items-center whitespace-nowrap rounded-full bg-accent px-4 font-semibold text-[0.95rem] text-on-accent no-underline hover:opacity-90">
          <span className="max-[40rem]:hidden">{t('common.openApp')}</span>
          <span className="hidden max-[40rem]:inline">{t('common.openAppShort')}</span>
        </a>
        <LanguageMenu />
        <ThemeToggle />
      </div>
    </header>
  )
}
