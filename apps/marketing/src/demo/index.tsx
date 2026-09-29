// The interactive phone demo. Depends on the visitor's clock and time zone,
// so the live phone (phone.tsx) only ever renders in the browser — this
// module is the region wrapper: it renders the same static fallback for
// server rendering, a no-JS visitor and the instant before hydration, and
// swaps in the live phone once mounted. The phone pulls in React Native (the
// app's shared screens through react-native-web), so it is its own chunk,
// never on the server, and not fetched at all until the demo nears the
// viewport (or is touched or focused), so a visitor on a phone who never
// scrolls to it never pays for it. Only the page's language's strings and
// content come with it (@ihsaanly/core/i18n/language-pack).

import { type LanguagePack, loadLanguagePack } from '@ihsaanly/core/i18n/language-pack'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { ClientOnly } from '@tanstack/react-router'
import { type ReactNode, Suspense, use, useEffect, useRef, useState } from 'react'
import { useSite } from '~/i18n/use-site'
import type { Phone as PhoneComponent } from './phone'

/** How far ahead of the viewport the phone starts loading, in pixels. */
const LOAD_AHEAD = 300

interface Loaded {
  Phone: typeof PhoneComponent
  pack: LanguagePack
}

const loads = new Map<SupportedLanguage, Promise<Loaded>>()

/** The phone chunk and one language's pack, fetched in parallel, once per language. */
function load(language: SupportedLanguage): Promise<Loaded> {
  let loading = loads.get(language)
  if (!loading) {
    loading = Promise.all([import('./phone'), loadLanguagePack(language)]).then(
      ([module, pack]) => ({ Phone: module.Phone, pack }),
    )
    loads.set(language, loading)
  }
  return loading
}

function LivePhone({ language }: { language: SupportedLanguage }): ReactNode {
  const { Phone, pack } = use(load(language))
  return <Phone pack={pack} />
}

/**
 * True once `target` comes within `LOAD_AHEAD` of the viewport, or is
 * pointed at or focused first. Browsers without IntersectionObserver load
 * straight away.
 */
interface Thing {
  near: boolean
}

function useNearViewport(target: { current: HTMLElement | null }): boolean {
  const [thing, setThing] = useState<Thing>({ near: false })
  const { near } = thing
  useEffect(() => {
    const element = target.current
    if (!element || near) return
    // Already on screen at mount (a desktop's first view): load now, without
    // waiting on the observer's first callback, which some headless and
    // throttled renderers delay until the next frame.
    const inView = element.getBoundingClientRect().top < window.innerHeight + LOAD_AHEAD
    if (inView || typeof IntersectionObserver === 'undefined') {
      setThing({ near: true })
      return
    }
    const reveal = (): void => setThing({ near: true })
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal()
      },
      { rootMargin: `${LOAD_AHEAD}px 0px` },
    )
    observer.observe(element)
    element.addEventListener('pointerdown', reveal, { once: true })
    element.addEventListener('focusin', reveal, { once: true })
    return (): void => {
      observer.disconnect()
      element.removeEventListener('pointerdown', reveal)
      element.removeEventListener('focusin', reveal)
    }
  }, [target, near])
  return near
}

/**
 * What a no-JS visitor (or the page before the phone loads) sees: the same
 * phone frame silhouette, with the one line that used to live in a
 * `<noscript>` where the live screens would otherwise render. No inline
 * `<style>`, no `style` prop — this fallback is plain markup only, since it
 * may render on the server.
 */
function DemoFallback({ message }: { message: string | null }): ReactNode {
  return (
    <div className="demo-phone" id="demo-phone">
      <div className="demo-phone-screen">
        <div className="demo-statusbar" aria-hidden="true" />
        <div className="demo-nav" />
        <div className="demo-content">
          {message ? <p className="demo-noscript">{message}</p> : null}
        </div>
        <div className="demo-tabbar-wrap">
          <div className="demo-tabbar" />
          <div className="demo-gesture-handle" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

/** The interactive phone demo. */
export function Demo(): ReactNode {
  const { a, locale } = useSite()
  const region = useRef<HTMLElement | null>(null)
  const near = useNearViewport(region)
  return (
    <section
      ref={region}
      className="demo flex flex-col items-center gap-6 max-[30rem]:overflow-x-clip"
      id="demo"
      aria-label={a('home.demo.label')}>
      <ClientOnly fallback={<DemoFallback message={a('home.demo.noscript')} />}>
        {near ? (
          <Suspense fallback={<DemoFallback message={null} />}>
            <LivePhone language={locale.code} />
          </Suspense>
        ) : (
          <DemoFallback message={null} />
        )}
      </ClientOnly>
    </section>
  )
}
