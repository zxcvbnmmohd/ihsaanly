// Store buttons, drawn like the stores' own black badges. They stay
// aria-disabled until a store link exists; a tap answers with "coming soon"
// via the toast, a polite live region that stays in the accessibility tree
// while empty (it is only transparent), so it is announced on every tap.
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useSite } from '~/i18n/use-site'

type StoreName = 'App Store' | 'Google Play'

const BADGE_CLASS =
  'store inline-flex min-w-[10.5rem] items-center gap-[0.6rem] rounded-[0.6rem] border border-[#a6a6a6] bg-black py-2 ps-[0.85rem] pe-[1.1rem] [font-family:-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,system-ui,sans-serif] text-[1.2rem] leading-[1.1] font-semibold text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-55 max-[40rem]:min-w-0 max-[40rem]:max-w-[14rem] max-[40rem]:flex-[1_1_9rem] max-[40rem]:justify-center max-[40rem]:px-[0.7rem] max-[40rem]:text-[1.05rem]'

export function StoreBadges(): ReactNode {
  const { t, a } = useSite()
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
    window.clearTimeout(timers.current.show)
    window.clearTimeout(timers.current.clear)
    setThing({ message: '' })
    const template = a('home.stores.soon')
    timers.current.show = window.setTimeout(() => {
      setThing({ message: template.replace('{store}', store) })
      timers.current.clear = window.setTimeout(() => setThing({ message: '' }), 4000)
    }, 50)
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          type="button"
          aria-disabled="true"
          onClick={() => announce('App Store')}
          className={BADGE_CLASS}>
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
          <span className="flex flex-col">
            <small className="font-normal text-[0.62rem] tracking-[0.02em]">
              {t('home.stores.appStorePrefix')}
            </small>
            App Store
          </span>
        </button>
        <button
          type="button"
          aria-disabled="true"
          onClick={() => announce('Google Play')}
          className={BADGE_CLASS}>
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
          <span className="flex flex-col">
            <small className="font-normal text-[0.62rem] tracking-[0.02em]">
              {t('home.stores.playPrefix')}
            </small>
            Google Play
          </span>
        </button>
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
