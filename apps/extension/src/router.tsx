import { createHashHistory, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Extension pages are static files with no server to fall back to, so routes live in the hash.
export const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
