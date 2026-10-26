/** Playback speeds a learner can pick: slow enough to follow, and the reciter's own. */
export const SPEEDS = [0.5, 0.75, 1] as const
export type Speed = (typeof SPEEDS)[number]

/** How many times a recitation plays: 1 is once (repeat off), `always` until stopped. */
export const REPEATS = [1, 2, 3, 5, 10, 'always'] as const
export type Repeat = (typeof REPEATS)[number]

/**
 * After a play reaches its end, whether to play it again. `plays` counts the
 * plays finished so far, the one that just ended included. `always` is left
 * to the player's own loop, so it never asks.
 */
export function playAgain(repeat: Repeat, plays: number): boolean {
  if (repeat === 'always') return true
  return plays < repeat
}
