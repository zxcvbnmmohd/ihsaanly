// Store buttons, drawn like the stores' own black badges. A badge with a URL
// is a real link; one without stays aria-disabled and answers a tap with a
// "coming soon" message via the toast, a polite live region that stays in the
// accessibility tree while empty (it is only transparent), so it is
// announced on every tap.
//
// The optional Chrome Web Store badge follows Google's branding rules: the
// official artwork appears only as a link to a published listing, so before
// launch it is a plain badge in the same style, without Google's logo.
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react'

type StoreName = 'App Store' | 'Google Play'

const BADGE_CLASS =
  'store inline-flex min-w-[10.5rem] items-center gap-[0.6rem] rounded-[0.6rem] border border-[#a6a6a6] bg-black py-2 ps-[0.85rem] pe-[1.1rem] [font-family:-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,system-ui,sans-serif] text-[1.2rem] leading-[1.1] font-semibold whitespace-nowrap text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-55 max-[40rem]:min-w-[9.5rem] max-[40rem]:max-w-[14rem] max-[40rem]:flex-[1_1_9.5rem] max-[40rem]:px-[0.7rem] max-[40rem]:text-[1.05rem]'

function AppStoreGlyph(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width="26"
      height="26"
      className="size-[1.6rem] flex-none">
      <path
        fill="currentColor"
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  )
}

// A generic puzzle piece (Material Symbols "extension", Apache 2.0), not Google's logo.
function ExtensionGlyph(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width="26"
      height="26"
      className="size-[1.6rem] flex-none">
      <path
        fill="currentColor"
        d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"
      />
    </svg>
  )
}

function GooglePlayGlyph(): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width="26"
      height="26"
      className="size-[1.6rem] flex-none">
      <path
        fill="currentColor"
        d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
      />
    </svg>
  )
}

export interface ChromeWebStoreBadge {
  /** The extension's listing; null shows the plain "coming soon" badge. */
  url: string | null
  /** Google's official "Available in the Chrome Web Store" artwork, self-hosted by the app. */
  imageSrc: string
  /** The official badge's alt text, in the page's language. */
  alt: string
  /** The small line above "Chrome Web Store" on the plain badge before launch. */
  soonPrefix: ReactNode
  /** The toast text for a tap on the plain badge. */
  soonMessage: string
}

export interface StoreBadgesProps {
  appStoreUrl: string | null
  playUrl: string | null
  /** The toast text for a tap on a badge with no URL yet, given the store's display name. */
  soonMessage: (store: string) => string
  /** The small line above the store name, official per-language wording where the host has it. */
  appStorePrefix?: ReactNode
  playPrefix?: ReactNode
  /** Adds a Chrome Web Store badge after the two phone stores. */
  chromeWebStore?: ChromeWebStoreBadge
}

export function StoreBadges({
  appStoreUrl,
  playUrl,
  soonMessage,
  appStorePrefix = 'Download on the',
  playPrefix = 'Get it on',
  chromeWebStore,
}: StoreBadgesProps): ReactNode {
  interface Thing {
    message: string
  }
  const [thing, setThing] = useState<Thing>({ message: '' })
  const { message } = thing
  const timers = useRef<{ show: number; clear: number }>({ show: 0, clear: 0 })

  useEffect(
    () => (): void => {
      window.clearTimeout(timers.current.show)
      window.clearTimeout(timers.current.clear)
    },
    [],
  )

  function announce(store: StoreName): void {
    say(soonMessage(store))
  }

  function say(text: string): void {
    window.clearTimeout(timers.current.show)
    window.clearTimeout(timers.current.clear)
    setThing({ message: '' })
    timers.current.show = window.setTimeout(() => {
      setThing({ message: text })
      timers.current.clear = window.setTimeout(() => setThing({ message: '' }), 4000)
    }, 50)
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {appStoreUrl ? (
          <a href={appStoreUrl} className={BADGE_CLASS}>
            <AppStoreGlyph />
            <span className="flex flex-col items-start text-start">
              <small className="font-normal text-[0.62rem] tracking-[0.02em]">
                {appStorePrefix}
              </small>
              App Store
            </span>
          </a>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => announce('App Store')}
            className={BADGE_CLASS}>
            <AppStoreGlyph />
            <span className="flex flex-col items-start text-start">
              <small className="font-normal text-[0.62rem] tracking-[0.02em]">
                {appStorePrefix}
              </small>
              App Store
            </span>
          </button>
        )}
        {playUrl ? (
          <a href={playUrl} className={BADGE_CLASS}>
            <GooglePlayGlyph />
            <span className="flex flex-col items-start text-start">
              <small className="font-normal text-[0.62rem] tracking-[0.02em]">{playPrefix}</small>
              Google Play
            </span>
          </a>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => announce('Google Play')}
            className={BADGE_CLASS}>
            <GooglePlayGlyph />
            <span className="flex flex-col items-start text-start">
              <small className="font-normal text-[0.62rem] tracking-[0.02em]">{playPrefix}</small>
              Google Play
            </span>
          </button>
        )}
        {chromeWebStore?.url ? (
          <a href={chromeWebStore.url} className="store inline-flex">
            <img
              src={chromeWebStore.imageSrc}
              alt={chromeWebStore.alt}
              width="340"
              height="96"
              className="block h-[3.15rem] w-auto max-[40rem]:h-[2.95rem]"
            />
          </a>
        ) : chromeWebStore ? (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => say(chromeWebStore.soonMessage)}
            className={BADGE_CLASS}>
            <ExtensionGlyph />
            <span className="flex flex-col items-start text-start">
              <small className="font-normal text-[0.62rem] tracking-[0.02em]">
                {chromeWebStore.soonPrefix}
              </small>
              Chrome Web Store
            </span>
          </button>
        ) : null}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 bottom-6 z-20 mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-full bg-ink px-[1.2rem] py-[0.7rem] text-center text-base text-wash-top shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] empty:pointer-events-none empty:opacity-0">
        {message}
      </p>
    </>
  )
}
