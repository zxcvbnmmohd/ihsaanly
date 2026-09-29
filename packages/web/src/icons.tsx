// Small, static, monoline SVG icons shared by every web host: the brand mark
// and the tab bar / back / search glyphs. No third-party icon set: every path
// is hand-drawn here, so a page loads nothing from anywhere.

import type { ReactElement, SVGProps } from 'react'

export interface BrandMarkProps {
  className?: string
}

/** The Ihsaanly brand mark: an eight-pointed rounded star. */
export function BrandMark({ className }: BrandMarkProps): ReactElement {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" width="30" height="30" className={className}>
      <path
        d="M50 7.6 62.4 20H80v17.6L92.4 50 80 62.4V80H62.4L50 92.4 37.6 80H20V62.4L7.6 50 20 37.6V20h17.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type WrapProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill' | 'stroke' | 'aria-hidden'>

export interface IconProps {
  className?: string
}

/**
 * The viewBox is 24x24; without an explicit width/height an `<svg>` falls
 * back to the browser default (300x150), which is why every icon takes one —
 * `width`/`height` default to that same 24 so a bare `<IconToday />` still
 * renders at the right size, and a host can still override either.
 */
function Wrap({ width = 24, height = 24, ...props }: WrapProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
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
export function IconToday({ className }: IconProps): ReactElement {
  return (
    <Wrap className={className}>
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </Wrap>
  )
}

/** Library: an open book. */
export function IconLibrary({ className }: IconProps): ReactElement {
  return (
    <Wrap className={className}>
      <path d="M12 6.2c-1.6-1-3.7-1.4-5.8-1.2-.7.1-1.2.7-1.2 1.4v10.4c0 .8.7 1.4 1.5 1.3 2-.2 4 .2 5.5 1.1 1.5-.9 3.5-1.3 5.5-1.1.8.1 1.5-.5 1.5-1.3V6.4c0-.7-.5-1.3-1.2-1.4-2.1-.2-4.2.2-5.8 1.2Z" />
      <path d="M12 6.2v12" />
    </Wrap>
  )
}

/** More: three dots, the familiar "everything else" glyph. */
export function IconMore({ className }: IconProps): ReactElement {
  return (
    <Wrap className={className}>
      <circle cx={5} cy={12} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={19} cy={12} r={1.4} fill="currentColor" stroke="none" />
    </Wrap>
  )
}

/**
 * The back chevron for a nav bar. Mirrors under RTL — "back" always points
 * toward where the previous screen is, which is the trailing edge in a
 * right-to-left layout.
 */
export function IconBack({ className }: IconProps): ReactElement {
  return (
    <Wrap className={`rtl:-scale-x-100 ${className ?? ''}`}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Wrap>
  )
}

/** A small search glyph for a search field. */
export function IconSearch({ className }: IconProps): ReactElement {
  return (
    <Wrap className={className}>
      <circle cx={10.5} cy={10.5} r={6} />
      <path d="M15 15l5 5" />
    </Wrap>
  )
}
