// Small enhancements for every page. Each one is optional: without
// JavaScript the page is complete, the language menu still works (it is a
// <details>), and the specimen shows its first dua in full.

const THEME_KEY = 'ihsaanly.theme'
const LOCALE_KEY = 'ihsaanly.locale'
const THEME_COLORS = { light: '#f7f0e9', dark: '#1b1411' }

// Storage can be missing or throw (private windows, blocked site data), and
// every choice it holds is a convenience, so a failure is simply ignored.
function readStored(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Not remembered; the choice still applies to this page.
  }
}

// ---- Appearance: System, Light, Dark ----
// The inline script in <head> applies a stored choice before first paint;
// this wires the button that changes it.

function setupTheme() {
  const button = document.querySelector('[data-theme-toggle]')
  if (!button) return
  const root = document.documentElement
  const order = ['system', 'light', 'dark']

  function current() {
    const theme = root.getAttribute('data-theme')
    return theme === 'light' || theme === 'dark' ? theme : 'system'
  }

  function label(mode) {
    const name = button.dataset[mode] || mode
    button.setAttribute('aria-label', (button.dataset.template || '{mode}').replace('{mode}', name))
    button.title = name
    button.dataset.mode = mode
  }

  function apply(mode) {
    if (mode === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', mode)
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      const media = meta.getAttribute('media') || ''
      const scheme = mode === 'system' ? (media.includes('dark') ? 'dark' : 'light') : mode
      meta.setAttribute('content', THEME_COLORS[scheme])
    }
    label(mode)
  }

  label(current())
  button.hidden = false
  button.addEventListener('click', () => {
    const next = order[(order.indexOf(current()) + 1) % order.length]
    apply(next)
    store(THEME_KEY, next === 'system' ? null : next)
  })
}

// ---- Language: remember an explicit choice, and suggest, never redirect ----

// Mirrors resolveLocale in src/i18n/locale.ts: an exact match first, then by
// language. Hong Kong and Macau read as Cantonese; Taiwan stays Mandarin.
const SUPPORTED = [
  'en-CA',
  'en-GB',
  'en-US',
  'ar',
  'fr',
  'it',
  'ja',
  'hi',
  'ur',
  'so',
  'zh-Hans',
  'yue',
]

function languageOf(tag) {
  return tag.split('-')[0] || tag
}

function normalise(tag) {
  return /^zh(-Hant)?-(HK|MO)$/i.test(tag) ? 'yue' : tag
}

function resolveLanguage(preferred) {
  const tags = preferred.map(normalise)
  const exact = tags.find((tag) => SUPPORTED.includes(tag))
  if (exact) return languageOf(exact)
  for (const tag of tags) {
    const match = SUPPORTED.find((locale) => languageOf(locale) === languageOf(tag))
    if (match) return languageOf(match)
  }
  return 'en'
}

function setupLanguage() {
  const menu = document.querySelector('.lang-menu')
  if (!menu) return

  for (const link of menu.querySelectorAll('a[data-locale]')) {
    link.addEventListener('click', () => store(LOCALE_KEY, link.dataset.locale))
  }

  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false
      menu.querySelector('summary')?.focus()
    }
  })

  suggestLanguage()
}

function suggestLanguage() {
  const data = document.getElementById('locale-offers')
  if (!data || readStored(LOCALE_KEY)) return

  let offers
  try {
    offers = JSON.parse(data.textContent || '{}')
  } catch {
    return
  }
  const preferred = navigator.languages?.length ? [...navigator.languages] : [navigator.language]
  const offer = offers[resolveLanguage(preferred.filter(Boolean))]
  if (!offer) return

  const banner = document.createElement('div')
  banner.className = 'suggest'
  banner.lang = offer.lang
  banner.dir = offer.dir

  const text = document.createElement('p')
  const [before, after = ''] = offer.text.split('{language}')
  const link = document.createElement('a')
  link.href = offer.href
  link.hreflang = offer.lang
  link.textContent = offer.name
  link.addEventListener('click', () => store(LOCALE_KEY, offer.code))
  text.append(before, link, after)

  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.textContent = offer.dismiss
  dismiss.addEventListener('click', () => {
    store(LOCALE_KEY, 'en')
    banner.remove()
  })

  banner.append(text, dismiss)
  document.querySelector('.skip')?.after(banner)
}

// ---- The specimen: a real item, with the app's way of learning it ----

function setupSpecimen() {
  const specimen = document.querySelector('.specimen')
  const data = document.getElementById('specimen-data')
  if (!specimen || !data) return

  let duas
  try {
    duas = JSON.parse(data.textContent || '[]')
  } catch {
    return
  }

  const field = (name) => specimen.querySelector(`[data-field="${name}"]`)
  const title = specimen.querySelector('#specimen-title')
  const next = specimen.querySelector('[data-next]')
  const practice = specimen.querySelector('[data-practice]')
  let index = 0

  function setLang(element, lang) {
    if (lang) element.setAttribute('lang', lang)
    else element.removeAttribute('lang')
  }

  function show(dua) {
    title.textContent = dua.title
    setLang(title, dua.titleLang)
    field('arabic').textContent = dua.arabic
    field('transliteration').textContent = dua.transliteration
    const translation = field('translation')
    translation.textContent = dua.translation ?? ''
    translation.hidden = dua.translation === null
    const source = field('source')
    const strong = document.createElement('strong')
    strong.textContent = dua.source
    source.replaceChildren(strong, dua.grading ? ` ${dua.grading}` : '')
  }

  if (next && duas.length > 1) {
    next.hidden = false
    next.addEventListener('click', () => {
      index = (index + 1) % duas.length
      show(duas[index])
    })
  }

  if (!practice) return
  practice.hidden = false
  for (const button of practice.querySelectorAll('[data-hide]')) {
    const target = field(button.dataset.hide)
    button.addEventListener('click', () => {
      const hidden = button.getAttribute('aria-pressed') !== 'true'
      button.setAttribute('aria-pressed', String(hidden))
      target.classList.toggle('is-hidden', hidden)
      target.setAttribute('aria-hidden', String(hidden))
    })
  }
}

// ---- Store buttons ----
// They stay aria-disabled until a store link exists. A tap says so instead of
// going nowhere; giving a button its real href and removing aria-disabled is
// all launch needs. The toast is a polite live region that stays in the
// accessibility tree while empty (it is only transparent), so it is announced.

function setupStores() {
  const toast = document.querySelector('.toast')
  if (!toast) return
  const template = toast.dataset.template || '{store}'
  let timer = 0

  for (const button of document.querySelectorAll('.store[aria-disabled="true"]')) {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      window.clearTimeout(timer)
      // Emptied first, so a second tap is announced again.
      toast.textContent = ''
      timer = window.setTimeout(() => {
        toast.textContent = template.replace('{store}', button.dataset.store || '')
        timer = window.setTimeout(() => {
          toast.textContent = ''
        }, 4000)
      }, 50)
    })
  }
}

setupTheme()
setupLanguage()
setupSpecimen()
setupStores()
