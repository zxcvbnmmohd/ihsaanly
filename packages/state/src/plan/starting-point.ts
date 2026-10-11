// Onboarding's last step, offered again from More. Nothing new is stored: the
// current preset is whichever one the Library's enabled items equal, so it
// stays honest after any toggle in the Library, and is null once the person
// has made the set their own. Choosing a preset only replaces the enabled
// items; history and marks are never touched.
import { items as content } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import { idsForPreset, presetFor, type StarterPreset } from '@ihsaanly/core/plan/presets'
import type { StartingPointScreenProps } from '@ihsaanly/ui/screens/starting-point'
import { getEnabledItems, setEnabledItems, useEnabledItems } from './enabled-store'

/**
 * The items shown only while tracking is paused are switched on by the app
 * itself the first time someone pauses (`offerPauseItems`), so they are left
 * out of the comparison: pausing does not turn "Just starting" into the
 * person's own set.
 */
function pauseOnly(items: Item[]): Set<string> {
  return new Set(items.filter((item) => item.onlyWhilePaused).map((item) => item.id))
}

/** The preset the enabled items equal, or null once they have been edited by hand. */
export function currentStartingPoint(enabled: string[], items: Item[]): StarterPreset | null {
  const paused = pauseOnly(items)
  return presetFor(
    enabled.filter((id) => !paused.has(id)),
    items.filter((item) => !paused.has(item.id)),
  )
}

/**
 * The enabled items once `preset` is chosen: the preset's own, plus any
 * pause-only items already on, which the person keeps whichever size they pick.
 */
export function enabledForPreset(
  preset: StarterPreset,
  enabled: string[],
  items: Item[],
): string[] {
  const paused = pauseOnly(items)
  const keep = new Set([...idsForPreset(preset, items), ...enabled.filter((id) => paused.has(id))])
  return items.filter((item) => keep.has(item.id)).map((item) => item.id)
}

/**
 * Asks the person whether to replace the items they chose themselves, and
 * calls `proceed` only if they agree: `Alert.alert` on mobile, `window.confirm`
 * on the web.
 */
export type ConfirmReplace = (proceed: () => void) => void

export function useStartingPoint(): StarterPreset | null {
  return currentStartingPoint(useEnabledItems(), content)
}

/**
 * The Starting point screen's props. Moving between presets needs no
 * confirmation, since another tap undoes it; replacing a hand-made set does,
 * since nothing brings it back.
 */
export function useStartingPointScreen(confirmReplace: ConfirmReplace): StartingPointScreenProps {
  const current = useStartingPoint()

  const onSelect = (preset: StarterPreset): void => {
    if (preset === current) return
    const apply = (): void => setEnabledItems(enabledForPreset(preset, getEnabledItems(), content))
    if (current === null) confirmReplace(apply)
    else apply()
  }

  return { current, onSelect }
}
