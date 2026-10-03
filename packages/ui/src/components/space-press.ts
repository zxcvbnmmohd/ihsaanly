import type { NativeSyntheticEvent } from 'react-native'

/**
 * A keydown handler that runs `action` on Space, once per press (not on key
 * repeat), and keeps the page from scrolling. react-native-web's Pressable
 * answers Enter for every role but Space only for role=button, while a
 * checkbox or switch toggles on Space. Native never sends key events here.
 */
export function onSpace(action: () => void): (event: NativeSyntheticEvent<unknown>) => void {
  return (event) => {
    const { key, repeat } = event.nativeEvent as KeyboardEvent
    if (key !== ' ') return
    event.preventDefault()
    if (!repeat) action()
  }
}
