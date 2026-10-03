import { afterEach, beforeEach, expect, it } from 'bun:test'
import { onServiceWorkerUpdate, registerServiceWorker } from './register-sw'

type Listener = () => void

class FakeWorker {
  state = 'installing'
  private listeners: Listener[] = []
  addEventListener(_type: string, listener: Listener): void {
    this.listeners.push(listener)
  }
  become(state: string): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
}

class FakeRegistration {
  installing: FakeWorker | null = null
  private listeners: Listener[] = []
  addEventListener(_type: string, listener: Listener): void {
    this.listeners.push(listener)
  }
  found(): void {
    for (const listener of this.listeners) listener()
  }
}

const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

let registrations: string[]
let registration: FakeRegistration
let controller: object | null
let outcome: 'resolve' | 'reject'

beforeEach(() => {
  registrations = []
  registration = new FakeRegistration()
  controller = {}
  outcome = 'resolve'
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      get controller() {
        return controller
      },
      register: (url: string) => {
        registrations.push(url)
        return outcome === 'resolve'
          ? Promise.resolve(registration)
          : Promise.reject(new Error('blocked'))
      },
    },
  })
})

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'serviceWorker', original)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
})

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

it('registers /sw.js and offers an update once a new worker installs under a controller', async () => {
  const offered: unknown[] = []
  onServiceWorkerUpdate((worker) => offered.push(worker))

  registerServiceWorker()
  await settle()
  expect(registrations).toEqual(['/sw.js'])

  // An updatefound with nothing installing is ignored.
  registration.found()

  const worker = new FakeWorker()
  registration.installing = worker
  registration.found()
  worker.become('installing')
  expect(offered).toHaveLength(0)
  worker.become('installed')
  expect(offered).toEqual([worker])
})

it('does not offer an update on the very first install (no controller yet)', async () => {
  const offered: unknown[] = []
  onServiceWorkerUpdate((worker) => offered.push(worker))
  controller = null

  registerServiceWorker()
  await settle()
  const worker = new FakeWorker()
  registration.installing = worker
  registration.found()
  worker.become('installed')
  expect(offered).toHaveLength(0)
})

it('swallows a registration that fails', async () => {
  outcome = 'reject'
  registerServiceWorker()
  await settle()
  expect(registrations).toEqual(['/sw.js'])
})

it('does nothing in a browser without service workers', () => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
  expect('serviceWorker' in navigator).toBe(false)
  registerServiceWorker()
  expect(registrations).toEqual([])
})
