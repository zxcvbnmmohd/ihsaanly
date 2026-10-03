// Per-file coverage for every workspace, checked against coverage.config.ts.
//
//   bun run coverage                          report; exits 0 unless tests fail
//   bun run coverage --enforce                exits 1 if any file is under the threshold
//   bun run coverage --workspace ui           one workspace (repeatable): name, short name or path
//   bun run coverage --no-run                 reuse each workspace's existing coverage/lcov.info
//   bun run coverage --all                    list every file, not only those under the threshold
//
// For each workspace with a `test:coverage` script this runs it (bun test
// --coverage, configured in the workspace's bunfig.toml to write
// coverage/lcov.info), then compares the lcov against every source file in
// the workspace. A source file the tests never load is MISSING and counts as
// 0%: Bun only reports files a test imported, so this is how untested files
// show up at all.
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { coverage as config } from '../coverage.config'

const ROOT = resolve(import.meta.dir, '..')

const SOURCE = /\.(?:tsx?|jsx?|mjs|cjs)$/
/** Never source: tests, declarations, generated route trees, build output, test infrastructure. */
const NOT_SOURCE = [
  /\.test\.[cm]?[jt]sx?$/,
  /\.d\.ts$/,
  /(?:^|\/)routeTree\.gen\.ts$/,
  /(?:^|\/)(?:node_modules|dist|coverage|\.expo|\.tanstack|__mocks__|__tests__)\//,
  // The generated native projects (expo prebuild) sit at a workspace's root;
  // folders named ios/ or android/ deeper in (src/widgets/ios) are source.
  /^(?:ios|android)\//,
  // A workspace's own test/ folder holds test helpers and post-build suites.
  /^test\//,
]
/** The web component-test preload swaps a native file for its `.web` sibling (packages/ui/test/preload.ts). */
const WEB_PRELOAD = /packages\/ui\/test\/preload\.ts|\.\/test\/preload\.ts/

interface Args {
  enforce: boolean
  run: boolean
  all: boolean
  workspaces: string[]
}

function parseArgs(argv: string[]): Args {
  const args: Args = { enforce: false, run: true, all: false, workspaces: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--enforce') args.enforce = true
    else if (arg === '--no-run') args.run = false
    else if (arg === '--all') args.all = true
    else if (arg === '--workspace' || arg === '-w') {
      const value = argv[++i]
      if (!value) throw new Error('--workspace needs a name')
      args.workspaces.push(value)
    } else if (arg?.startsWith('--workspace=')) args.workspaces.push(arg.slice(12))
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

interface Workspace {
  name: string
  dir: string
  /** Repo-relative, e.g. packages/ui. */
  path: string
  webPreload: boolean
}

function workspaces(): Workspace[] {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    workspaces: { packages: string[] }
  }
  const found: Workspace[] = []
  for (const pattern of manifest.workspaces.packages) {
    for (const file of new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: ROOT })) {
      const path = file.slice(0, -'/package.json'.length)
      const pkg = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as {
        name: string
        scripts?: Record<string, string>
      }
      if (!pkg.scripts?.['test:coverage']) continue
      const bunfig = join(ROOT, path, 'bunfig.toml')
      found.push({
        name: pkg.name,
        dir: join(ROOT, path),
        path,
        webPreload: existsSync(bunfig) && WEB_PRELOAD.test(readFileSync(bunfig, 'utf8')),
      })
    }
  }
  return found.sort((a, b) => a.path.localeCompare(b.path))
}

function matches(workspace: Workspace, wanted: string): boolean {
  const short = workspace.name.replace(/^@[^/]+\//, '')
  return [workspace.name, short, workspace.path].includes(wanted.replace(/\/$/, ''))
}

function globToRegExp(glob: string): RegExp {
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\/?/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replaceAll('\u0000', '(?:.*/)?')
  return new RegExp(`^${pattern}$`)
}

const EXCLUDED = config.exclude.map(({ path }) => globToRegExp(path))

/** Workspace-relative source files: tracked or new (not ignored), minus NOT_SOURCE and the exclude list. */
function sourceFiles(workspace: Workspace): string[] {
  const listed = Bun.spawnSync(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '--', '.'],
    { cwd: workspace.dir },
  )
  return listed.stdout
    .toString()
    .split('\n')
    .filter((file) => file && SOURCE.test(file) && existsSync(join(workspace.dir, file)))
    .filter((file) => !NOT_SOURCE.some((pattern) => pattern.test(file)))
    .filter((file) => !EXCLUDED.some((pattern) => pattern.test(`${workspace.path}/${file}`)))
    .sort()
}

interface FileCoverage {
  lines: { found: number; hit: number }
  functions: { found: number; hit: number }
}

/** lcov records keyed by workspace-relative path; records for other workspaces' files are dropped. */
function parseLcov(workspace: Workspace): Map<string, FileCoverage> | null {
  const file = join(workspace.dir, 'coverage', 'lcov.info')
  if (!existsSync(file)) return null
  const records = new Map<string, FileCoverage>()
  let current: FileCoverage | null = null
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [key, value = ''] = line.split(/:(.*)/s)
    if (key === 'SF') {
      const path = relative(workspace.dir, resolve(workspace.dir, value))
      current = { lines: { found: 0, hit: 0 }, functions: { found: 0, hit: 0 } }
      if (!path.startsWith('..')) records.set(path, current)
    } else if (current && key === 'LF') current.lines.found = Number(value)
    else if (current && key === 'LH') current.lines.hit = Number(value)
    else if (current && key === 'FNF') current.functions.found = Number(value)
    else if (current && key === 'FNH') current.functions.hit = Number(value)
    else if (key === 'end_of_record') current = null
  }
  return records
}

const percent = ({ found, hit }: { found: number; hit: number }): number =>
  found === 0 ? 100 : (hit / found) * 100

interface Row {
  file: string
  lines: number
  functions: number
  status: 'ok' | 'types' | 'below' | 'missing' | 'stubbed'
}

interface Report {
  workspace: Workspace
  testsPassed: boolean
  output: string
  rows: Row[]
  /** Summed over the files the tests loaded. */
  lines: { found: number; hit: number }
  functions: { found: number; hit: number }
}

function webSibling(workspace: Workspace, file: string): boolean {
  if (file.includes('.web.')) return false
  const base = file.replace(/\.[^.]+$/, '')
  return ['.web.tsx', '.web.ts', '.web.js'].some((ext) =>
    existsSync(join(workspace.dir, `${base}${ext}`)),
  )
}

/** True when a file compiles to nothing: only types, so no test can load code from it. */
function typesOnly(path: string): boolean {
  const loader = path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'jsx'
  try {
    const code = new Bun.Transpiler({ loader, trimUnusedImports: true }).transformSync(
      readFileSync(path, 'utf8'),
    )
    return code.replace(/export\s*\{\s*\};?/g, '').trim() === ''
  } catch {
    return false
  }
}

/**
 * True when an lcov record plausibly describes this file's own code rather
 * than the one-line re-export the web preload swaps in: it must account for at
 * least half of the file's non-blank, non-comment lines.
 */
function coversOwnCode(
  workspace: Workspace,
  file: string,
  record: FileCoverage | undefined,
): boolean {
  if (!record) return false
  const code = readFileSync(join(workspace.dir, file), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'),
    )
  return record.lines.found >= code.length / 2
}

function report(workspace: Workspace, testsPassed: boolean, output: string): Report {
  const lcov = parseLcov(workspace) ?? new Map<string, FileCoverage>()
  const lines = { found: 0, hit: 0 }
  const functions = { found: 0, hit: 0 }
  const rows = sourceFiles(workspace).map((file): Row => {
    const record = lcov.get(file)
    if (
      workspace.webPreload &&
      webSibling(workspace, file) &&
      !coversOwnCode(workspace, file, record)
    ) {
      // Under the web preload this file is a re-export of its `.web` sibling,
      // so a record that only saw the re-export is not about this file's code.
      // A test that imports the native file directly (`./x.tsx?native`) records
      // its real lines, and is judged like any other file.
      return { file, lines: 0, functions: 0, status: 'stubbed' }
    }
    if (!record) {
      return typesOnly(join(workspace.dir, file))
        ? { file, lines: 100, functions: 100, status: 'types' }
        : { file, lines: 0, functions: 0, status: 'missing' }
    }
    lines.found += record.lines.found
    lines.hit += record.lines.hit
    functions.found += record.functions.found
    functions.hit += record.functions.hit
    const row = { file, lines: percent(record.lines), functions: percent(record.functions) }
    const ok = row.lines >= config.lines && row.functions >= config.functions
    return { ...row, status: ok ? 'ok' : 'below' }
  })
  return { workspace, testsPassed, output, rows, lines, functions }
}

async function runCoverage(workspace: Workspace): Promise<{ passed: boolean; output: string }> {
  rmSync(join(workspace.dir, 'coverage'), { recursive: true, force: true })
  const child = Bun.spawn(['bun', 'run', 'test:coverage'], {
    cwd: workspace.dir,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { passed: code === 0, output: `${stdout}${stderr}` }
}

/** Runs `task` over `items`, at most `limit` at a time, keeping order. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index] as T)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const pct = (value: number): string => `${value.toFixed(1).padStart(5)}%`
const LABEL: Record<Row['status'], string> = {
  ok: '      ',
  types: 'TYPES',
  below: 'BELOW ',
  missing: 'MISSING',
  stubbed: 'STUBBED',
}

function print(reports: Report[], all: boolean): void {
  console.log(
    `\nCoverage per file (threshold: lines ${config.lines}%, functions ${config.functions}%)`,
  )
  for (const r of reports) {
    const counts = { ok: 0, types: 0, below: 0, missing: 0, stubbed: 0 }
    for (const row of r.rows) counts[row.status]++
    console.log(
      `\n${r.workspace.name} (${r.workspace.path})${r.testsPassed ? '' : '  TESTS FAILED'}: ` +
        `${counts.ok + counts.types}/${r.rows.length} files at threshold` +
        `${counts.types ? ` (${counts.types} types-only)` : ''}, ${counts.below} below, ` +
        `${counts.missing} missing${counts.stubbed ? `, ${counts.stubbed} stubbed` : ''}`,
    )
    for (const row of r.rows) {
      if ((row.status === 'ok' || row.status === 'types') && !all) continue
      const numbers =
        row.status === 'missing' || row.status === 'stubbed' || row.status === 'types'
          ? '     -       -  '
          : `${pct(row.lines)}  ${pct(row.functions)}`
      console.log(`  ${LABEL[row.status].padEnd(7)} ${numbers}  ${row.file}`)
    }
  }

  console.log('\nSummary (lines/functions summed over the files tests load; missing files are 0%)')
  const header = ['workspace', 'files', 'ok', 'below', 'missing', 'lines', 'functions', 'tests']
  const table = reports.map((r) => {
    const count = (status: Row['status']): number =>
      r.rows.filter((row) => row.status === status).length
    return [
      r.workspace.name,
      String(r.rows.length),
      String(count('ok') + count('types')),
      String(count('below')),
      String(count('missing') + count('stubbed')),
      pct(percent(r.lines)).trim(),
      pct(percent(r.functions)).trim(),
      r.testsPassed ? 'pass' : 'FAIL',
    ]
  })
  const totals = reports.reduce(
    (sum, r) => {
      sum.files += r.rows.length
      sum.ok += r.rows.filter((row) => row.status === 'ok' || row.status === 'types').length
      return sum
    },
    { files: 0, ok: 0 },
  )
  const widths = header.map((h, i) =>
    Math.max(h.length, ...table.map((row) => row[i]?.length ?? 0)),
  )
  const line = (cells: string[]): string =>
    cells
      .map((cell, i) => (i === 0 ? cell.padEnd(widths[i] ?? 0) : cell.padStart(widths[i] ?? 0)))
      .join('  ')
  console.log(line(header))
  for (const row of table) console.log(line(row))
  console.log(`\n${totals.ok}/${totals.files} source files at threshold.`)
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  let selected = workspaces()
  if (args.workspaces.length > 0) {
    const unknown = args.workspaces.filter((w) => !selected.some((ws) => matches(ws, w)))
    if (unknown.length > 0) {
      console.error(`No workspace with a test:coverage script matches: ${unknown.join(', ')}`)
      return 2
    }
    selected = selected.filter((ws) => args.workspaces.some((w) => matches(ws, w)))
  }

  const reports = await pool(selected, 4, async (workspace) => {
    if (!args.run) return report(workspace, true, '')
    process.stderr.write(`running ${workspace.name} test:coverage\n`)
    const { passed, output } = await runCoverage(workspace)
    return report(workspace, passed, output)
  })

  for (const r of reports.filter((r) => !r.testsPassed)) {
    console.log(`\n--- ${r.workspace.name}: tests failed ---\n${r.output.trim()}`)
  }
  print(reports, args.all)

  if (reports.some((r) => !r.testsPassed)) return 1
  const failing = reports.flatMap((r) =>
    r.rows.filter((row) => row.status !== 'ok' && row.status !== 'types'),
  )
  if (args.enforce && failing.length > 0) {
    console.log(`\n--enforce: ${failing.length} file(s) under the threshold.`)
    return 1
  }
  return 0
}

process.exit(await main())
