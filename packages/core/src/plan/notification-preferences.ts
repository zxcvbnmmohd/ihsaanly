import { z } from 'zod'

export const QuietHours = z.object({
  /** Local hour the quiet period starts, inclusive. */
  from: z.number().int().min(0).max(23),
  /** Local hour it ends, exclusive. Wraps past midnight when `to` <= `from`. */
  to: z.number().int().min(0).max(23),
})

export type QuietHours = z.infer<typeof QuietHours>

export const NotificationPreferences = z.object({
  windows: z.boolean(),
  lookAhead: z.boolean(),
  prayers: z.boolean(),
  quietHours: QuietHours.nullable(),
  /** Per-item override. Absent means the category decides. */
  perItem: z.record(z.string(), z.boolean()),
  maxPerDay: z.number().int().min(0).max(10),
})

export type NotificationPreferences = z.infer<typeof NotificationPreferences>

/**
 * Two or three a day, and nothing for the obligatory prayers unless asked:
 * the user almost certainly has an adhan app already, and a duplicate is what
 * gets an app deleted in its first week.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  windows: true,
  lookAhead: true,
  prayers: false,
  quietHours: { from: 22, to: 7 },
  perItem: {},
  maxPerDay: 3,
}
