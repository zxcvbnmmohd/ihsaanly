import type { ReactNode } from 'react'

export function FaqItem({
  question,
  answer,
}: {
  question: ReactNode
  answer: ReactNode
}): ReactNode {
  return (
    <details className="group border-rule border-b first-of-type:border-t">
      <summary className="relative cursor-pointer list-none py-[0.9rem] ps-0 pe-8 after:absolute after:end-1 after:top-[0.8rem] after:text-[1.3rem] after:text-accent after:leading-none after:transition-transform after:duration-200 after:ease-in-out after:content-['+'] group-open:after:rotate-45 [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <p className="mb-4 text-ink-soft">{answer}</p>
    </details>
  )
}
