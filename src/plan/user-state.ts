import { z } from 'zod'

/**
 * Both switches are manual and neither is ever inferred. The pause has no
 * timer: duration varies and nifas runs to forty days, so auto-resuming would
 * accrue make-up for prayers that must not be made up.
 */
export const UserState = z.object({
  travelling: z.boolean(),
  trackingPaused: z.boolean(),
})

export type UserState = z.infer<typeof UserState>

export const DEFAULT_USER_STATE: UserState = {
  travelling: false,
  trackingPaused: false,
}
