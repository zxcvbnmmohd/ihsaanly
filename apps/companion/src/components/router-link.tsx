// The Link every @ihsaanly/ui screen renders through `useUi().Link` (see
// packages/ui/src/provider.tsx: UiLinkProps). Screens always wrap a single
// Pressable in it with `asChild`, expecting that Pressable to be the
// clickable thing — so rather than reimplement Radix-style prop merging,
// this wraps it in a real `<a href>` (for accessibility and "open in new
// tab") sized to its child with `display: contents`, which leaves the
// Pressable's own layout untouched, and hands a plain click to the router.
import type { UiLinkProps } from '@ihsaanly/ui/provider'
import { useRouter } from '@tanstack/react-router'
import type { MouseEvent, ReactElement } from 'react'

export function isPlainLeftClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function RouterLink({ href, children }: UiLinkProps): ReactElement {
  const router = useRouter()
  return (
    <a
      href={href}
      style={{ display: 'contents' }}
      onClick={(event) => {
        if (!isPlainLeftClick(event)) return
        event.preventDefault()
        void router.navigate({ href })
      }}>
      {children}
    </a>
  )
}
