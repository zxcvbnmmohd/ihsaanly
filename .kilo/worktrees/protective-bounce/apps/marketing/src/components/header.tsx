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
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          width="30"
          height="30"
          className="size-[1.9rem] text-accent">
          <path
            d="M50 7.6 62.4 20H80v17.6L92.4 50 80 62.4V80H62.4L50 92.4 37.6 80H20V62.4L7.6 50 20 37.6V20h17.6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </svg>
        Ihsaanly
      </Link>
      <div className="flex items-center gap-[0.35rem]">
        <LanguageMenu />
        <ThemeToggle />
      </div>
    </header>
  )
}
