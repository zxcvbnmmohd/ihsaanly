/**
 * The web's version of `Linking.openSettings()`: there is no OS settings page
 * a browser tab can open (capabilities.systemSettings is off on web), so there
 * is nothing to do. Declined access is recovered in the page instead.
 */
export function openSystemSettings(): void {
  // Deliberately empty.
}
