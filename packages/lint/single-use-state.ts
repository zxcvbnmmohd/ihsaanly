// One `useState` per file, holding a single object typed by a local `Thing`
// interface and destructured as `[thing, setThing]`:
//
//   interface Thing { query: string; declined: boolean }
//   const [thing, setThing] = useState<Thing>({ query: '', declined: false })
//
// Scattered or loosely typed state hooks drift out of sync and hide what a
// component holds. Biome plugins cannot count across a file, so each app runs
// this from a test. ponytail: regex over source, move to an AST walk if it ever misfires.
import { Glob } from 'bun'

const CALL = /\buseState\s*(?:<[^>]*>)?\s*\(/g
const CANONICAL = /const\s*\[\s*thing\s*,\s*setThing\s*\]\s*=\s*useState<Thing>\(/

export function problemsIn(source: string): string[] {
  const calls = source.match(CALL) ?? []
  if (calls.length === 0) return []
  if (calls.length > 1) return ['more than one useState; combine them into one Thing object']
  return CANONICAL.test(source) ? [] : ['write it as const [thing, setThing] = useState<Thing>(…)']
}

/** Every offending file under `root`, as "path: problem". */
export async function offendersUnder(
  root: string,
  pattern = 'src/**/*.{ts,tsx}',
): Promise<string[]> {
  const offenders: string[] = []
  for await (const path of new Glob(pattern).scan(root)) {
    const source = await Bun.file(`${root}/${path}`).text()
    for (const problem of problemsIn(source)) offenders.push(`${path}: ${problem}`)
  }
  return offenders
}
