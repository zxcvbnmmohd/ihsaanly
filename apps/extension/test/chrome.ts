// A typed fake of the slice of `chrome` the extension uses. One instance per
// process (background.ts registers its listeners once, on import), so tests
// call `reset()` to clear state and recorded calls but keep the listeners.
type Listener = (...args: never[]) => unknown

export class FakeEvent<F extends Listener> {
  readonly listeners: F[] = []
  addListener = (listener: F): void => {
    this.listeners.push(listener)
  }
  /** Calls every listener and waits for the ones that return promises. */
  async fire(...args: Parameters<F>): Promise<void> {
    await Promise.all(this.listeners.map((listener) => listener(...args)))
  }
}

export interface FakeAlarm {
  name: string
  scheduledTime: number
  periodInMinutes?: number
}

class FakeStorageArea {
  data = new Map<string, unknown>()
  get = async (key: string): Promise<Record<string, unknown>> =>
    this.data.has(key) ? { [key]: this.data.get(key) } : {}
  set = async (items: Record<string, unknown>): Promise<void> => {
    for (const [key, value] of Object.entries(items)) this.data.set(key, value)
  }
  remove = async (keys: string | string[]): Promise<void> => {
    for (const key of [keys].flat()) this.data.delete(key)
  }
}

export class FakeChrome {
  readonly alarmEvents = new FakeEvent<(alarm: { name: string }) => unknown>()
  readonly clicked = new FakeEvent<(id: string) => unknown>()
  readonly buttonClicked = new FakeEvent<(id: string, index: number) => unknown>()
  readonly installed = new FakeEvent<() => unknown>()

  alarmList = new Map<string, FakeAlarm>()
  notificationsShown: { id: string; options: Record<string, unknown> }[] = []
  notificationsCleared: string[] = []
  permissionLevel: 'granted' | 'denied' = 'granted'
  badgeText: string[] = []
  badgeTitle: string[] = []
  badgeColors: unknown[] = []
  tabsCreated: { url: string }[] = []
  popupOpens = 0
  /** When set, `action.openPopup()` rejects with it (Chrome before 127, no focused window). */
  popupError: Error | null = null
  /** What `launchWebAuthFlow` resolves with, or the error it rejects with. */
  authResult: string | undefined | Error = undefined
  authCalls: { url: string; interactive: boolean }[] = []
  uiLanguage = 'en-US'

  readonly local = new FakeStorageArea()
  readonly session = new FakeStorageArea()

  readonly api = {
    alarms: {
      onAlarm: this.alarmEvents,
      getAll: async (): Promise<FakeAlarm[]> => [...this.alarmList.values()],
      create: async (name: string, info: { when?: number; periodInMinutes?: number }) => {
        this.alarmList.set(name, {
          name,
          scheduledTime: info.when ?? 0,
          periodInMinutes: info.periodInMinutes,
        })
      },
      clear: async (name: string): Promise<boolean> => this.alarmList.delete(name),
    },
    notifications: {
      onClicked: this.clicked,
      onButtonClicked: this.buttonClicked,
      create: (id: string, options: Record<string, unknown>): void => {
        this.notificationsShown.push({ id, options })
      },
      clear: (id: string): void => {
        this.notificationsCleared.push(id)
      },
      getPermissionLevel: (callback: (level: string) => void): void => {
        callback(this.permissionLevel)
      },
    },
    storage: { local: this.local, session: this.session },
    action: {
      setBadgeText: async ({ text }: { text: string }) => {
        this.badgeText.push(text)
      },
      setTitle: async ({ title }: { title: string }) => {
        this.badgeTitle.push(title)
      },
      setBadgeBackgroundColor: async ({ color }: { color: unknown }) => {
        this.badgeColors.push(color)
      },
      openPopup: async () => {
        if (this.popupError) throw this.popupError
        this.popupOpens += 1
      },
    },
    tabs: {
      create: async (properties: { url: string }) => {
        this.tabsCreated.push(properties)
      },
    },
    runtime: {
      onInstalled: this.installed,
      getURL: (path: string): string => `chrome-extension://fake-id/${path}`,
      getManifest: (): { version: string } => ({ version: '0.0.1' }),
    },
    identity: {
      getRedirectURL: (): string => 'https://fake-id.chromiumapp.org/',
      launchWebAuthFlow: async (details: { url: string; interactive: boolean }) => {
        this.authCalls.push(details)
        if (this.authResult instanceof Error) throw this.authResult
        return this.authResult
      },
    },
    i18n: { getUILanguage: (): string => this.uiLanguage },
  }

  /** Clears state and recorded calls; listeners stay registered. */
  reset(): void {
    this.alarmList.clear()
    this.notificationsShown = []
    this.notificationsCleared = []
    this.permissionLevel = 'granted'
    this.badgeText = []
    this.badgeTitle = []
    this.badgeColors = []
    this.tabsCreated = []
    this.popupOpens = 0
    this.popupError = null
    this.authResult = undefined
    this.authCalls = []
    this.uiLanguage = 'en-US'
    this.local.data.clear()
    this.session.data.clear()
  }
}

export const fakeChrome = new FakeChrome()
;(globalThis as unknown as { chrome: unknown }).chrome = fakeChrome.api
