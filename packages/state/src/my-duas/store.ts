import { installPersonalItems } from '@ihsaanly/core/content'
import {
  MAX_OWN_DUAS,
  MAX_PINNED,
  OwnDua,
  ownDuaItems,
  upsertOwnDua,
} from '@ihsaanly/core/content/my-duas'
import { z } from 'zod'

import { createPreferenceStore } from '../storage/preference-store'

/**
 * My duas: library items the user pinned, and duas they wrote. Both are
 * preferences, so they sync with an account like the rest (cloud/keys.ts) and
 * a reload after a sync reaches every reader.
 */
const pinned = createPreferenceStore('pinnedItems', z.array(z.string()), [])
const own = createPreferenceStore('ownDuas', z.array(OwnDua), [])

export const getPinnedItems = pinned.get
export const usePinnedItems = pinned.use

let installed: OwnDua[] | null = null

/**
 * The duas with a moment become items the plan can place (core content's
 * `itemById` finds them). Installed whenever the list is read and differs
 * from the last one installed, so a sync from another device lands too.
 */
function install(list: OwnDua[]): OwnDua[] {
  if (list !== installed) {
    installed = list
    installPersonalItems(ownDuaItems(list))
  }
  return list
}

export function getOwnDuas(): OwnDua[] {
  return install(own.get())
}

export function useOwnDuas(): OwnDua[] {
  return install(own.use())
}

export function ownDuaById(list: OwnDua[], id: string): OwnDua | null {
  return list.find((dua) => dua.id === id) ?? null
}

/** Pins or unpins; a full set takes no more pins. */
export function togglePinned(id: string): void {
  const current = getPinnedItems()
  if (current.includes(id)) {
    pinned.set(current.filter((entry) => entry !== id))
    return
  }
  if (current.length >= MAX_PINNED) return
  pinned.set([...current, id])
}

/** Saves an edit in place, or a new dua at the end. False when a new one would exceed the cap. */
export function saveOwnDua(dua: OwnDua): boolean {
  const current = getOwnDuas()
  const isNew = ownDuaById(current, dua.id) === null
  if (isNew && current.length >= MAX_OWN_DUAS) return false
  own.set(upsertOwnDua(current, dua))
  getOwnDuas()
  return true
}

export function deleteOwnDua(id: string): void {
  own.set(getOwnDuas().filter((dua) => dua.id !== id))
  getOwnDuas()
}
