/** Bundled images resolve to an asset id that expo-image and Image accept as a source. */
declare module '*.png' {
  const source: number
  export default source
}
