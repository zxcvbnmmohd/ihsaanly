// ponytail: registers the hand-rolled sw.js postbuild writes (see
// scripts/postbuild.ts); nothing here decides caching policy, only whether a
// worker is registered at all, and whether an update is offered.
export type UpdateListener = (worker: ServiceWorker) => void

let onUpdate: UpdateListener | null = null

/** The route/component that draws the update banner sets this once. */
export function onServiceWorkerUpdate(listener: UpdateListener): void {
  onUpdate = listener
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        if (!worker) return
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdate?.(worker)
          }
        })
      })
    })
    .catch(() => {
      // Offline support is a nicety; its absence changes nothing else.
    })
}
