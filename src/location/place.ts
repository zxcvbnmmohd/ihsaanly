import { z } from 'zod'

export const Place = z.object({
  label: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  source: z.enum(['device', 'city']),
})

export type Place = z.infer<typeof Place>
