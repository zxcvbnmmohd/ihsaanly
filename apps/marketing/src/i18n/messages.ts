// The client-facing boundary for messages. At prerender time this runs on the
// server and its result is written out as a static JSON file; client-side
// navigation fetches that file, so no server is needed after the build.
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { z } from 'zod'
import { LOCALES } from './locales'
import { catalogue, type Strings } from './messages.server'
import { plain } from './rich-text'

interface Offer {
  text: string
  dismiss: string
}

export interface Messages {
  strings: Strings
  /** English pages only: each language's own "available in" line for the suggestion banner. */
  offers: Partial<Record<string, Offer>> | null
}

export const getMessages = createServerFn({ method: 'GET' })
  .validator(z.object({ lang: z.enum(SUPPORTED_LANGUAGES) }))
  .middleware([staticFunctionMiddleware])
  .handler(({ data }): Messages => {
    const { strings } = catalogue(data.lang)
    if (data.lang !== 'en') return { strings, offers: null }
    const offers: Record<string, Offer> = {}
    for (const { code } of LOCALES) {
      if (code === 'en') continue
      const own = catalogue(code).strings
      offers[code] = {
        text: plain(own['common.suggest.text'] ?? ''),
        dismiss: plain(own['common.suggest.dismiss'] ?? ''),
      }
    }
    return { strings, offers }
  })
