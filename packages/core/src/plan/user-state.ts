import { z } from 'zod'

/**
 * Whether the midday prayer on a Friday is Jumu'ah. `auto` resolves from what
 * the app already knows (see `attendsJumuah` in ./jumuah); the other two are
 * the user saying so outright.
 */
export const JumuahChoice = z.enum(['auto', 'attend', 'dhuhr'])

export type JumuahChoice = z.infer<typeof JumuahChoice>

/**
 * Both switches are manual and neither is ever inferred. The pause has no
 * timer: duration varies and nifas runs to forty days, so auto-resuming would
 * accrue make-up for prayers that must not be made up.
 *
 * `jumuah` defaults so a row written before it existed still parses; without
 * the default the whole row would fail and fall back, silently turning off a
 * journey or a pause the user had set.
 */
export const UserState = z.object({
  travelling: z.boolean(),
  trackingPaused: z.boolean(),
  jumuah: JumuahChoice.default('auto'),
  /**
   * The civil day (YYYY-MM-DD) to ask whether the pause is over, chosen when
   * pausing; null or absent for no check-in. A question, never a timer: the
   * pause still ends only when the user says so. It travels inside userState,
   * already declared health-adjacent, and is optional so a row written before
   * it existed, or by an older app, still parses.
   */
  pauseCheckInOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

export type UserState = z.infer<typeof UserState>

export const DEFAULT_USER_STATE: UserState = {
  travelling: false,
  trackingPaused: false,
  jumuah: 'auto',
  pauseCheckInOn: null,
}
