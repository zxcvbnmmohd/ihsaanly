import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { Footer } from './footer'
import { Header } from './header'
import { LocaleSuggestion } from './locale-suggestion'

export function SiteLayout({ children }: { children: ReactNode }): ReactNode {
  const { t } = useSite()
  return (
    <>
      <a
        href="#main"
        className="fixed start-[clamp(1rem,4vw,2.5rem)] top-3 z-10 -translate-y-[calc(100%+1rem)] bg-paper px-[0.9rem] py-2 text-ink focus:translate-y-0">
        {t('common.skip')}
      </a>
      <LocaleSuggestion />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  )
}
