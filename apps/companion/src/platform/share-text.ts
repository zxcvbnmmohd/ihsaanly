/**
 * The web's version of `Share.share({ message })`: the native share sheet
 * where one exists, else the clipboard. Either way the caller only needs to
 * know whether the text actually went somewhere the user can find it.
 */
export async function shareText(text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return true
    } catch {
      // Includes the user cancelling the share sheet; either way nothing sent.
      return false
    }
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
