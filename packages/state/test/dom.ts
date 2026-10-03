/**
 * A DOM and `@testing-library/react` for hook tests. The rest of this package
 * runs without a DOM (and the web backend test installs its own
 * `localStorage`), so a test file opts in and gives it back afterwards.
 * React DOM decides whether it has a browser when it is first loaded, hence the
 * dynamic import after registering.
 */
import { afterAll, afterEach } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

export async function withDom(): Promise<typeof import('@testing-library/react')> {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  GlobalRegistrator.register({ url: 'http://localhost/' })
  afterAll(() => GlobalRegistrator.unregister())
  const library = await import('@testing-library/react')
  afterEach(() => library.cleanup())
  return library
}
