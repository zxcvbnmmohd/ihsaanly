import type { Item } from '@/content/schema'

export type StarterPreset = 'starting' | 'essentials' | 'everything'

export const STARTER_PRESETS: StarterPreset[] = ['starting', 'essentials', 'everything']

/**
 * Five things someone new can carry from the first day: two windows, one
 * dhikr, two duas. Small enough to keep, real enough to shape a day.
 */
export const STARTING_ENABLED = [
  'morning-adhkar',
  'evening-adhkar',
  'tasbih-after-prayer',
  'dua-sleeping',
  'dua-eating',
]

export function idsForPreset(preset: StarterPreset, items: Item[]): string[] {
  switch (preset) {
    case 'starting':
      return items.filter((item) => STARTING_ENABLED.includes(item.id)).map((item) => item.id)
    case 'essentials':
      return items.filter((item) => item.defaultOn).map((item) => item.id)
    case 'everything':
      return items.map((item) => item.id)
  }
}

/** The preset an enabled set equals, or null once it has been edited by hand. */
export function presetFor(enabled: string[], items: Item[]): StarterPreset | null {
  const chosen = new Set(enabled)
  return (
    STARTER_PRESETS.find((preset) => {
      const ids = idsForPreset(preset, items)
      return ids.length === chosen.size && ids.every((id) => chosen.has(id))
    }) ?? null
  )
}
