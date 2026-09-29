import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'
import { WRAP } from './layout-classes'

export function NotFoundPage(): ReactNode {
  const { t } = useSite()
  return (
    <div className={WRAP}>
      <article className="legal max-w-[40rem] pt-[clamp(1.5rem,5vw,3.5rem)]">
        <h1 className="mb-2 font-normal text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.08] tracking-[-0.015em]">
          {t('notFound.title')}
        </h1>
        <p>{t('notFound.text')}</p>
      </article>
    </div>
  )
}
