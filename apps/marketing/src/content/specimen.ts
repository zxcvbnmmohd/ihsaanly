// Client-facing boundary for the specimen: a static server function, run once
// per language at prerender time and fetched as JSON afterwards.
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { z } from 'zod'
import { catalogue } from '~/i18n/messages.server'
import { type SpecimenDua, specimenDuas } from './specimen.server'

export type { SpecimenDua }

export const getSpecimen = createServerFn({ method: 'GET' })
  .validator(z.object({ lang: z.enum(SUPPORTED_LANGUAGES) }))
  .middleware([staticFunctionMiddleware])
  .handler(({ data }): SpecimenDua[] => specimenDuas(data.lang, catalogue(data.lang).strings))
