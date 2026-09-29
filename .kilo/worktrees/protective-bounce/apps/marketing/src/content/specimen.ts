// Client-facing boundary for the specimen: a static server function, run once
// per language at prerender time and fetched as JSON afterwards.
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { z } from 'zod'
import { LOCALE_CODES } from '~/i18n/locales'
import { catalogue } from '~/i18n/messages.server'
import { type SpecimenDua, specimenDuas } from './specimen.server'

export type { SpecimenDua }

export const getSpecimen = createServerFn({ method: 'GET' })
  .validator(z.object({ lang: z.enum(LOCALE_CODES) }))
  .middleware([staticFunctionMiddleware])
  .handler(({ data }): SpecimenDua[] => specimenDuas(data.lang, catalogue(data.lang).strings))
