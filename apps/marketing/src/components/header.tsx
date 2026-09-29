import { BrandMark } from '@ihsaanly/web/icons'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { LanguageMenu } from './language-menu'
import { WRAP } from './layout-classes'
import { ThemeToggle } from './theme-toggle'

export function Header(): ReactNode {
  const { locale, a } = useSite()
  return (
    <header className={`${WRAP} flex items-center justify-between gap-4 py-6`}>
      <Link
        to="/{-$lang}/"
        params={{ lang: locale.code === 'en' ? undefined : locale.code }}
        aria-label={a('common.brandHome')}
        className="brand inline-flex items-center gap-[0.6rem] font-serif text-ink text-xl tracking-[0.01em] no-underline">
        <BrandMark className="size-[1.9rem] text-accent" />
        Ihsaanly
      </Link>
      <div className="flex items-center gap-[0.35rem]">
        <LanguageMenu />
        <ThemeToggle />
      </div>
    </header>
  )
}
