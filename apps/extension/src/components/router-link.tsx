// The Link every @ihsaanly/ui screen renders through `useUi().Link` (see
// packages/ui/src/provider.tsx: UiLinkProps). Screens always wrap a single
// Pressable in it with `asChild`, expecting that Pressable to be the
// clickable thing — so rather than reimplement Radix-style prop merging,
// this wraps it in a real `<a href>` (for accessibility and "open in new
// tab") sized to its child with `display: contents`, which leaves the
// Pressable's own layout untouched, and hands a plain click to the router.
//
// The click is taken in the capture phase: react-native-web's Pressable
// stops a click's propagation in its own onClick, so a bubbling handler here
// never runs for a real pointer click on the row (only for one aimed at the
// anchor itself), and the browser would follow the href natively. The href
// comes from the router's history, so it is right for the history type too
// (`popup.html#/location` under the extension's hash history) and even a
// native follow, such as open in a new tab, lands on the route.
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
      href={router.history.createHref(href)}
      style={{ display: 'contents' }}
      onClickCapture={(event) => {
        if (!isPlainLeftClick(event)) return
        event.preventDefault()
        void router.navigate({ href })
      }}>
      {children}
    </a>
  )
}
