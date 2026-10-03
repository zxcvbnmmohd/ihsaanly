/** Opens a page outside the app in a new tab, without handing it this window (`noopener`). */
export function openUrl(url: string): void {
  window.open(url, '_blank', 'noopener')
}
