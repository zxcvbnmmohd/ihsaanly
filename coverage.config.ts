// What `bun run coverage` (scripts/coverage.ts) holds every workspace to.
//
// Every source file in a workspace counts: a file no test loads is reported
// as missing, at 0%. A file's coverage comes only from its own workspace's
// tests (ui's tests running core code do not cover core).

export interface CoverageConfig {
  /** Minimum line coverage per file, in percent. */
  lines: number
  /** Minimum function coverage per file, in percent. */
  functions: number
  /**
   * Repo-relative paths (or globs) left out of the check entirely. Only for
   * files that genuinely cannot run under `bun test` (a native-only module,
   * a build-tool config Bun cannot load). Every entry carries a comment
   * saying why; "hard to test" is not a reason, and a file that can be
   * tested with a mock (docs/TESTING.md) must be.
   */
  exclude: { path: string; why: string }[]
}

export const coverage: CoverageConfig = {
  lines: 100,
  functions: 100,
  exclude: [
    // { path: 'apps/mobile/metro.config.js', why: 'Metro loads it; Bun cannot evaluate it' },
  ],
}
