/** The web's version of `Alert.alert(..., [{style: 'destructive'}])`: a native confirm dialog. */
export function confirmAction(message: string): boolean {
  return window.confirm(message)
}
