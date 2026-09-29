/**
 * The web's version of `Sharing.shareAsync`: there is no share sheet to hand
 * a file to, so it is offered as a download instead — a Blob URL behind a
 * momentary `<a download>`, released once the click has been dispatched.
 */
export function downloadFile(name: string, contents: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
