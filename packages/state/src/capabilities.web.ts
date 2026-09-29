/**
 * Runs in place of `./capabilities` on the web (pattern: see the header of
 * `apps/mobile/src/widgets/publish.ts`). None of these exist as web APIs yet:
 * reminders need the phone app, there is no background location, no share
 * sheet that takes an image, and no OS settings screen to open.
 */
import type { Capabilities } from './capabilities'

export const capabilities: Capabilities = {
  reminders: false,
  homeDetection: false,
  shareImage: false,
  systemSettings: false,
}
