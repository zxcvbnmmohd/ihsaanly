// The sync suite's other webServer: the Firebase Auth + Firestore emulators
// for project demo-ihsaanly, with the real packages/cloud/firestore.rules
// (packages/cloud/firebase.json). Same command as `bun run dev:cloud`.
//
// The emulators need Java 21. The repo's mise.toml pins it, so this runs
// through `mise exec` when mise can be found ($MISE_BIN, or `mise` on PATH);
// otherwise it trusts the Java on PATH (CI's setup-java).
//
//   bun e2e/sync/support/emulators.ts
import { spawn, spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { PROJECT } from './env.ts'

const CLOUD = join(import.meta.dirname, '..', '..', '..', 'packages', 'cloud')
const firebase = [
  'bunx',
  'firebase-tools@15',
  'emulators:start',
  '--only',
  'auth,firestore',
  '--project',
  PROJECT,
]

function findMise(): string | null {
  if (process.env.MISE_BIN) return process.env.MISE_BIN
  const found = spawnSync('sh', ['-c', 'command -v mise'], { encoding: 'utf8' })
  return found.status === 0 && found.stdout.trim() ? found.stdout.trim() : null
}

const mise = findMise()
const [command, ...args] = mise ? [mise, 'exec', '--', ...firebase] : firebase
const child = spawn(command as string, args, { cwd: CLOUD, stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
