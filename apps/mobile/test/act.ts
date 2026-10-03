import { act } from '@testing-library/react'

/** Runs `action` inside `act` and waits for what it started, so the state it caused is applied. */
export function run(action: () => unknown): Promise<void> {
  return act(async () => {
    await action()
  })
}

/** Lets timers and promises that are already in flight settle, inside `act`. */
export function settle(ms = 5): Promise<void> {
  return run(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
}
