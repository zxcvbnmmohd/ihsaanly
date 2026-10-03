import { en } from '@ihsaanly/core/strings/en'
import type { Layout } from '@ihsaanly/ui/layout'
import { UiProvider } from '@ihsaanly/ui/provider'
import type { ReactElement, ReactNode } from 'react'

const colour = '#000000'

/** Gives `useLayout()` a fixed answer, the way the app's UiProvider does for real. */
export function LayoutHost({
  layout,
  children,
}: {
  layout: Layout
  children: ReactNode
}): ReactElement {
  return (
    <UiProvider
      value={{
        strings: en,
        scheme: 'light',
        layout,
        Link: ({ children: inner }) => inner,
        systemColors: {
          label: colour,
          secondaryLabel: colour,
          separator: colour,
          systemBackground: colour,
          secondarySystemBackground: colour,
          tint: colour,
          onTint: colour,
        },
      }}>
      {children}
    </UiProvider>
  )
}
