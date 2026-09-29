// The demo phone's own status-bar chrome (Wi-Fi, signal, battery) — not part
// of the app's real UI, so these stay marketing-only. The tab bar / back /
// search glyphs live in @ihsaanly/web/icons, shared with the app's own web
// host chrome.

import type { ReactElement } from 'react'

/** Status bar: Wi-Fi. */
export function IconWifi(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 18.6a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z" />
      <path d="M8.1 14a5.6 5.6 0 0 1 7.8 0l-1.4 1.5a3.5 3.5 0 0 0-5 0L8.1 14Z" />
      <path d="M4.9 10.8a9.9 9.9 0 0 1 14.2 0l-1.4 1.5a7.8 7.8 0 0 0-11.4 0L4.9 10.8Z" />
    </svg>
  )
}

/** Status bar: cellular signal, four bars. */
export function IconSignal(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x={2} y={14} width={3.2} height={6} rx={0.6} />
      <rect x={7.6} y={11} width={3.2} height={9} rx={0.6} />
      <rect x={13.2} y={7.5} width={3.2} height={12.5} rx={0.6} />
      <rect x={18.8} y={4} width={3.2} height={16} rx={0.6} />
    </svg>
  )
}

/** Status bar: battery, mostly full. */
export function IconBattery(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x={1.5} y={7} width={18} height={10} rx={2.4} />
      <rect x={3.2} y={8.7} width={13} height={6.6} rx={1.1} fill="currentColor" stroke="none" />
      <path d="M21 10v4" strokeLinecap="round" />
    </svg>
  )
}
