// The pages the sign-in notice and the settings list link to.
export const PRIVACY_URL = 'https://ihsaanly.app/legal/privacy'
export const TERMS_URL = 'https://ihsaanly.app/legal/terms'
export const GEONAMES_URL = 'https://www.geonames.org/about.html'

/** Signing in agrees to these; the notice under the buttons links both. */
export const LEGAL = {
  termsUrl: TERMS_URL,
  privacyUrl: PRIVACY_URL,
  onOpen: (url: string): void => {
    window.open(url, '_blank', 'noopener')
  },
}
