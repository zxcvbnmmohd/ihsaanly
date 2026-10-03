import { ensureBuilt } from './builds.ts'

export default function globalSetup(): void {
  for (const flavour of ['local', 'cloud', 'beta'] as const) ensureBuilt(flavour)
}
