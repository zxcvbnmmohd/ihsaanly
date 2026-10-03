/**
 * The one-line stores built on `createPreferenceStore`: each is its key, its
 * schema and its default, and that is what is checked here. How a store
 * behaves in general is `storage/preference-store.test.ts`.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../test/dom'
import { resetStorage } from '../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('./storage/backend')
const { reloadPreferences } = await import('./storage/preference-store')
const events = await import('./events/store')
const hijri = await import('./hijri/store')
const location = await import('./location/store')
const memorise = await import('./memorise/store')
const notifications = await import('./notifications/store')
const onboarding = await import('./onboarding/store')
const enabled = await import('./plan/enabled-store')
const suggestion = await import('./plan/suggestion-store')
const userState = await import('./plan/user-state-store')
const backlog = await import('./prayer/backlog-store')
const calculation = await import('./prayer/store')
const fasting = await import('./fasting/store')
const optIns = await import('./opt-ins/store')
const contentModule = await import('@ihsaanly/core/content')
const { glossary } = await import('@ihsaanly/core/content/glossary')
const { DEFAULT_SUGGESTION } = await import('@ihsaanly/core/plan/suggest')
const { DEFAULT_USER_STATE } = await import('@ihsaanly/core/plan/user-state')
const { DEFAULT_CALCULATION_PREFERENCES } = await import('@ihsaanly/core/prayer/calculation')
const { DEFAULT_NOTIFICATION_PREFERENCES } = await import(
  '@ihsaanly/core/plan/notification-preferences'
)
const { items } = await import('@ihsaanly/core/content')

const place = {
  label: 'London',
  latitude: 51.5,
  longitude: -0.12,
  timeZone: 'Europe/London',
  source: 'city',
} as const

interface Case<T> {
  name: string
  key: string
  get: () => T
  set: (value: T) => void
  use: () => T
  fallback: T
  value: T
  /** Stored JSON that no longer fits the schema. */
  invalid: string
}

const cases: Case<unknown>[] = [
  {
    name: 'event settings',
    key: 'events',
    get: events.getEventSettings,
    set: events.setEventSettings as (value: unknown) => void,
    use: events.useEventSettings,
    fallback: events.DEFAULT_EVENT_SETTINGS,
    value: {
      detectHome: true,
      home: { latitude: 1, longitude: 2, label: 'Home' },
      manual: ['rain'],
    },
    invalid: '{"detectHome":"yes"}',
  },
  {
    name: 'hijri offset',
    key: 'hijriOffset',
    get: hijri.getHijriOffset,
    set: hijri.setHijriOffset as (value: unknown) => void,
    use: hijri.useHijriOffset,
    fallback: 0,
    value: 1,
    invalid: '99',
  },
  {
    name: 'place',
    key: 'place',
    get: location.getPlace,
    set: location.setPlace as (value: unknown) => void,
    use: location.usePlace,
    fallback: null,
    value: place,
    invalid: '{"label":""}',
  },
  {
    name: 'known items',
    key: 'knownItems',
    get: memorise.getKnownItems,
    set: memorise.setKnownItems as (value: unknown) => void,
    use: memorise.useKnownItems,
    fallback: [],
    value: ['ayat-al-kursi'],
    invalid: '"nope"',
  },
  {
    name: 'notification preferences',
    key: 'notifications',
    get: notifications.getNotificationPreferences,
    set: notifications.setNotificationPreferences as (value: unknown) => void,
    use: notifications.useNotificationPreferences,
    fallback: DEFAULT_NOTIFICATION_PREFERENCES,
    value: { ...DEFAULT_NOTIFICATION_PREFERENCES, maxPerDay: 1 },
    invalid: '[]',
  },
  {
    name: 'onboarding',
    key: 'onboarding',
    get: onboarding.getOnboarding,
    set: onboarding.setOnboarding as (value: unknown) => void,
    use: onboarding.useOnboarding,
    fallback: onboarding.DEFAULT_ONBOARDING,
    value: { completed: true, gender: 'female', completedAt: '2026-01-01T00:00:00.000Z' },
    invalid: '{"completed":true,"gender":"robot"}',
  },
  {
    name: 'enabled items',
    key: 'enabledItems',
    get: enabled.getEnabledItems,
    set: enabled.setEnabledItems as (value: unknown) => void,
    use: enabled.useEnabledItems,
    fallback: enabled.defaultEnabled(),
    value: ['one'],
    invalid: '{}',
  },
  {
    name: 'suggestion state',
    key: 'suggestion',
    get: suggestion.getSuggestion,
    set: suggestion.setSuggestion as (value: unknown) => void,
    use: suggestion.useSuggestion,
    fallback: DEFAULT_SUGGESTION,
    value: { ...DEFAULT_SUGGESTION },
    invalid: '42',
  },
  {
    name: 'user state',
    key: 'userState',
    get: userState.getUserState,
    set: userState.setUserState as (value: unknown) => void,
    use: userState.useUserState,
    fallback: DEFAULT_USER_STATE,
    value: { ...DEFAULT_USER_STATE, travelling: true },
    invalid: '"x"',
  },
  {
    name: 'calculation preferences',
    key: 'calculation',
    get: calculation.getCalculationPreferences,
    set: calculation.setCalculationPreferences as (value: unknown) => void,
    use: calculation.useCalculationPreferences,
    fallback: DEFAULT_CALCULATION_PREFERENCES,
    value: { ...DEFAULT_CALCULATION_PREFERENCES, asr: 'hanafi' },
    invalid: '{"method":"nonsense"}',
  },
  {
    name: 'prayer backlog',
    key: 'qadaBacklog',
    get: backlog.getQadaBacklog,
    set: ((value: Record<string, number>) => {
      Object.entries(value).forEach(([prayer, count]) =>
        backlog.setBacklog(prayer as 'fajr', count),
      )
    }) as (value: unknown) => void,
    use: backlog.useQadaBacklog,
    fallback: {},
    value: { fajr: 3 },
    invalid: '{"fajr":-1}',
  },
  {
    name: 'announcements',
    key: 'announcements',
    get: optIns.getAnnouncements,
    set: optIns.setAnnouncements as (value: unknown) => void,
    use: optIns.useAnnouncements,
    fallback: optIns.DEFAULT_ANNOUNCEMENTS,
    value: { enabled: true, subscribed: 'ar' },
    invalid: '{"enabled":true,"subscribed":"klingon"}',
  },
  {
    name: 'crash reports',
    key: 'crashReports',
    get: optIns.getCrashReports,
    set: optIns.setCrashReports as (value: unknown) => void,
    use: optIns.useCrashReports,
    fallback: false,
    value: true,
    invalid: '"yes"',
  },
]

describe.each(cases)('the $name store', (store) => {
  beforeEach(resetStorage)

  it('answers its default until something is stored', () => {
    expect(store.get()).toEqual(store.fallback)
    expect(renderHook(() => store.use()).result.current).toEqual(store.fallback)
  })

  it('stores a value on the device and re-renders readers', () => {
    const { result } = renderHook(() => store.use())

    act(() => store.set(store.value))

    expect(result.current).toEqual(store.value)
    expect(store.get()).toEqual(store.value)
    expect(JSON.parse(backend.readPreferenceRow(store.key)?.value ?? 'null')).toEqual(store.value)
  })

  it('falls back to its default when what is stored no longer fits', () => {
    backend.writePreferenceRow(store.key, store.invalid)
    reloadPreferences()

    expect(store.get()).toEqual(store.fallback)
  })
})

describe('announcement topics', () => {
  it('are the shared topic and the language one', () => {
    expect(optIns.announcementTopics('ar')).toEqual(['announcements', 'announcements-ar'])
    expect(optIns.languageTopic('zh')).toBe('announcements-zh')
  })
})

describe('toggling', () => {
  beforeEach(resetStorage)

  it('adds a known item and takes it off again', () => {
    memorise.toggleKnown('a')
    memorise.toggleKnown('b')
    expect(memorise.getKnownItems()).toEqual(['a', 'b'])

    memorise.toggleKnown('a')
    expect(memorise.getKnownItems()).toEqual(['b'])
  })

  it('starts with the items that are on by default, and toggles from there', () => {
    expect(enabled.defaultEnabled()).toEqual(
      items.filter((item) => item.defaultOn).map((item) => item.id),
    )
    expect(enabled.getEnabledItems()).toEqual(enabled.defaultEnabled())

    const first = enabled.defaultEnabled()[0] ?? ''
    enabled.toggleEnabled(first)
    expect(enabled.getEnabledItems()).not.toContain(first)

    enabled.toggleEnabled(first)
    expect(enabled.getEnabledItems()).toContain(first)
  })

  it('reads the default from the content installed at startup, not the content at import', () => {
    const { content, installContent, resetContent } = contentModule
    const [first, ...rest] = content.items
    if (!first) throw new Error('no items')
    const flipped = { ...first, defaultOn: !first.defaultOn }
    try {
      expect(
        installContent({
          items: { ...content, items: [flipped, ...rest] },
          glossary,
          translations: [],
        }),
      ).toBe(true)
      reloadPreferences()
      expect(enabled.getEnabledItems().includes(first.id)).toBe(flipped.defaultOn)
    } finally {
      resetContent()
      reloadPreferences()
    }
  })

  it('never lets a prayer backlog go below nothing, and keeps the others', () => {
    backlog.setBacklog('fajr', 4)
    backlog.setBacklog('asr', -2)

    expect(backlog.getQadaBacklog()).toEqual({ fajr: 4, asr: 0 })
  })

  it('never lets the fast backlog go below nothing', () => {
    const { result } = renderHook(() => fasting.useFastBacklog())

    act(() => fasting.setFastBacklog(5))
    expect(result.current).toBe(5)

    act(() => fasting.setFastBacklog(-3))
    expect(result.current).toBe(0)
  })
})
