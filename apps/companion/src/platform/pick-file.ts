/**
 * The web's version of `DocumentPicker.getDocumentAsync`: a hidden
 * `<input type="file">`, clicked programmatically. Resolves the chosen
 * file's text, or null if it could not be read. There is no reliable
 * cross-browser cancel event, so a picker closed without a choice simply
 * never resolves — the caller only ever awaits it from a button press.
 */
export function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (): void => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      file
        .text()
        .then(resolve)
        .catch(() => resolve(null))
    }
    input.click()
  })
}
