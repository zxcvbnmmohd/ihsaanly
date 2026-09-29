// Small, static, monoline SVG icons for the tab bar, back control and status
// bar. No third-party icon set: every path is hand-drawn here, so the phone
// loads nothing from anywhere. Ported from the vanilla HTML-string builders
// in the old icons.ts as plain JSX components — no innerHTML anywhere in the
// React port.

import type { ReactElement, SVGProps } from 'react'

type WrapProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill' | 'stroke' | 'aria-hidden'>

function Wrap(props: WrapProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

/** Today: a sun, for the moment rather than the calendar. */
export function IconToday(): ReactElement {
  return (
    <Wrap>
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </Wrap>
  )
}

/** Library: an open book. */
export function IconLibrary(): ReactElement {
  return (
    <Wrap>
      <path d="M12 6.2c-1.6-1-3.7-1.4-5.8-1.2-.7.1-1.2.7-1.2 1.4v10.4c0 .8.7 1.4 1.5 1.3 2-.2 4 .2 5.5 1.1 1.5-.9 3.5-1.3 5.5-1.1.8.1 1.5-.5 1.5-1.3V6.4c0-.7-.5-1.3-1.2-1.4-2.1-.2-4.2.2-5.8 1.2Z" />
      <path d="M12 6.2v12" />
    </Wrap>
  )
}

/** More: three dots, the familiar "everything else" glyph. */
export function IconMore(): ReactElement {
  return (
    <Wrap>
      <circle cx={5} cy={12} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={19} cy={12} r={1.4} fill="currentColor" stroke="none" />
    </Wrap>
  )
}

/** The back chevron for item detail's nav bar. */
export function IconBack(): ReactElement {
  return (
    <Wrap>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Wrap>
  )
}

/** A small search glyph for the Library field. */
export function IconSearch(): ReactElement {
  return (
    <Wrap>
      <circle cx={10.5} cy={10.5} r={6} />
      <path d="M15 15l5 5" />
    </Wrap>
  )
}

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
