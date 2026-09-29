import '@ihsaanly/web/zod-jitless'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// biome-ignore lint/plugin: the router's inferred type is what types every route, link and loader.
export function getRouter() {
  return createRouter({
    routeTree,
    // Pages are directories (/legal/privacy/), as the host serves them.
    trailingSlash: 'always',
    scrollRestoration: true,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
