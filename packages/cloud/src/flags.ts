import { z } from 'zod'

/**
 * Remote flags. Each field defaults and falls back on a bad value, so one
 * mistyped flag in the console never discards the others.
 */
export const Flags = z.object({
  /** Kill switch for sync if the backend misbehaves or the quota runs out. */
  syncEnabled: z.stringbool().default(true).catch(true),
})

export type Flags = z.infer<typeof Flags>

export const DEFAULT_FLAGS: Flags = Flags.parse({})
