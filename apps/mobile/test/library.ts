/**
 * Fills two gaps in the shared expo-router fake (test/router.tsx) for the
 * Library and Today routes: `Color.android.dynamic.*` (read eagerly by
 * src/theme/colors.ts) and the native-only `Stack.SearchBar`. Idempotent, so
 * it is safe if another test file or the shared fake adds them too.
 */
import { act } from '@testing-library/react'
import { expoRouter, Stack } from './router'

const named = (): object => new Proxy({}, { get: (_target, key) => String(key) })

const color = expoRouter.Color as unknown as Record<string, unknown>
if (!('android' in color)) {
  color.android = { dynamic: named() }
}

export interface SearchBarProps {
  placeholder: string
  onChangeText: (event: { nativeEvent: { text?: string } }) => void
  onCancelButtonPress: () => void
  onClose: () => void
}

/** Every `<Stack.SearchBar>` rendered since the last reset, in order. */
export const searchBars: SearchBarProps[] = []

const stack = Stack as unknown as { SearchBar?: unknown }
stack.SearchBar ??= (props: SearchBarProps): null => {
  searchBars.push(props)
  return null
}

/** `act` for async work (flushes the promises the callback starts). */
export async function actAsync(work: () => unknown): Promise<void> {
  // biome-ignore lint/nursery/useAwaitThenable: React's async act returns a thenable the type does not show.
  await act(async () => {
    await work()
  })
}
