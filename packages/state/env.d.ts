/**
 * This package never renders an image, but a screen's exported prop types
 * (e.g. `@ihsaanly/ui/screens/onboarding`, for `useOnboardingFlow`'s return
 * type) pull that screen's whole module graph into this program too,
 * including its bundled images. Mirrors `packages/ui/env.d.ts`.
 */
declare module '*.png' {
  const source: number
  export default source
}
