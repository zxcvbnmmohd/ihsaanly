import { z } from 'zod'

export const EXPORT_VERSION = 1

export const ExportedEvent = z.object({
  kind: z.string(),
  subject: z.string(),
  at: z.number(),
  logDay: z.string(),
  deltaSeconds: z.number().nullable(),
})

export const ExportedData = z.object({
  format: z.literal('ihsaanly-export'),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  preferences: z.record(z.string(), z.unknown()),
  events: z.array(ExportedEvent),
})

export type ExportedData = z.infer<typeof ExportedData>
export type ExportedEvent = z.infer<typeof ExportedEvent>

/**
 * Import merges rather than replaces. An event already present, matched on
 * kind, subject and instant, is left alone — so importing the same file twice
 * changes nothing.
 */
export function eventsToAdd(existing: ExportedEvent[], incoming: ExportedEvent[]): ExportedEvent[] {
  const seen = new Set(existing.map((event) => `${event.kind}|${event.subject}|${event.at}`))

  return incoming.filter((event) => !seen.has(`${event.kind}|${event.subject}|${event.at}`))
}

export function parseExport(raw: string): ExportedData | null {
  try {
    const parsed = ExportedData.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
