/**
 * Draws the app icon, the adaptive icon, the splash mark, the notification icon
 * and the two in-app motif stamps from the one motif the app already has. Run with
 * `bun scripts/build-brand-assets.ts`, or with `--variants <dir>` to write
 * comparison sheets somewhere scratch instead of touching `assets/`.
 *
 * The motif is the eight-point star in `src/components/onboarding-art.tsx`:
 * two squares, each 0.72 of its box and centred, one turned 45°. That is
 * geometry rather than artwork, so it can be drawn here exactly as the app
 * draws it on screen, and the two stay in step by construction. Colours come
 * from `src/theme/colors.ts`, which holds the only literal hex in the app.
 *
 * Stores disagree about alpha: iOS rejects an icon with transparent pixels,
 * Android wants a transparent foreground it can mask. So the icon is written
 * without an alpha channel at all and everything else keeps one.
 */
import { deflateSync } from 'node:zlib'

/** Straight from `palettes` in src/theme/colors.ts. Keep them in step. */
const ACCENT = '#a94a32'
const ON_ACCENT = '#fff6f0'
const WASH_TOP = '#f7f0e9'
const WASH_BOTTOM = '#e8cdbd'

const SUPERSAMPLE = 4
const SQUARE = 0.72
const CORNER = 0.04

interface Rgb {
  r: number
  g: number
  b: number
}

interface Mark {
  /** Null paints nothing behind the star, which leaves the alpha channel doing the work. */
  background: [Rgb, Rgb] | null
  colour: Rgb
  /** Width of the star as a fraction of the canvas. */
  scale: number
  /** Stroke width as a fraction of the mark, or null for a solid star. Scale-relative
   * so the outline reads the same whether the star fills the canvas or sits inside an
   * Android safe area. */
  outline: number | null
}

function rgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/**
 * Signed distance to a rounded square centred on the origin. Negative inside,
 * which is all the caller needs to know.
 */
function boxDistance(x: number, y: number, half: number, radius: number): number {
  const qx = Math.abs(x) - (half - radius)
  const qy = Math.abs(y) - (half - radius)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside + Math.min(Math.max(qx, qy), 0) - radius
}

/** The union of the two squares. One is turned 45°, so its point is rotated instead. */
function insideStar(x: number, y: number, half: number, radius: number): boolean {
  if (boxDistance(x, y, half, radius) <= 0) return true

  const turned = Math.SQRT1_2 * (x + y)
  const other = Math.SQRT1_2 * (y - x)
  return boxDistance(turned, other, half, radius) <= 0
}

function coverageAt(x: number, y: number, size: number, mark: Mark): number {
  const centre = size / 2
  const half = (size * mark.scale * SQUARE) / 2
  const radius = size * mark.scale * CORNER
  const inner = mark.outline === null ? null : half - size * mark.scale * mark.outline
  let hits = 0

  for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
    for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
      const px = x + (sx + 0.5) / SUPERSAMPLE - centre
      const py = y + (sy + 0.5) / SUPERSAMPLE - centre
      if (!insideStar(px, py, half, radius)) continue
      // A hollow star is the outer shape minus the same shape drawn smaller.
      if (inner !== null && insideStar(px, py, inner, radius)) continue
      hits += 1
    }
  }

  return hits / (SUPERSAMPLE * SUPERSAMPLE)
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const name = new TextEncoder().encode(type)
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(name, 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(new Uint8Array([...name, ...data])))
  return out
}

/** Colour type 2 is RGB, colour type 6 is RGBA. iOS icons must be the former. */
function encode(size: number, pixels: Uint8Array, alpha: boolean): Uint8Array {
  const stride = alpha ? 4 : 3
  const raw = new Uint8Array(size * (1 + size * stride))
  let cursor = 0

  for (let y = 0; y < size; y += 1) {
    raw[cursor] = 0
    cursor += 1
    raw.set(pixels.subarray(y * size * stride, (y + 1) * size * stride), cursor)
    cursor += size * stride
  }

  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, size)
  view.setUint32(4, size)
  header.set([8, alpha ? 6 : 2, 0, 0, 0], 8)

  return new Uint8Array([
    ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    ...chunk('IHDR', header),
    ...chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
    ...chunk('IEND', new Uint8Array()),
  ])
}

function draw(size: number, mark: Mark): Uint8Array {
  const alpha = mark.background === null
  const stride = alpha ? 4 : 3
  const pixels = new Uint8Array(size * size * stride)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cover = coverageAt(x, y, size, mark)
      const at = (y * size + x) * stride

      if (mark.background === null) {
        pixels[at] = mark.colour.r
        pixels[at + 1] = mark.colour.g
        pixels[at + 2] = mark.colour.b
        pixels[at + 3] = Math.round(cover * 255)
        continue
      }

      // Wash first, star over it, in one pass so nothing is composited twice.
      const [top, bottom] = mark.background
      const down = size === 1 ? 0 : y / (size - 1)
      const over = (from: number, to: number, ink: number): number =>
        Math.round((from + (to - from) * down) * (1 - cover) + ink * cover)

      pixels[at] = over(top.r, bottom.r, mark.colour.r)
      pixels[at + 1] = over(top.g, bottom.g, mark.colour.g)
      pixels[at + 2] = over(top.b, bottom.b, mark.colour.b)
    }
  }

  return encode(size, pixels, alpha)
}

const wash: [Rgb, Rgb] = [rgb(WASH_TOP), rgb(WASH_BOTTOM)]
const solid: [Rgb, Rgb] = [rgb(ACCENT), rgb(ACCENT)]

const VARIANTS: Record<string, Mark> = {
  wash: { background: wash, colour: rgb(ACCENT), scale: 0.62, outline: null },
  accent: { background: solid, colour: rgb(ON_ACCENT), scale: 0.62, outline: null },
  outline: { background: wash, colour: rgb(ACCENT), scale: 0.68, outline: 0.032 },
}

const variantsFlag = process.argv.indexOf('--variants')

if (variantsFlag !== -1) {
  const directory = process.argv[variantsFlag + 1]
  if (!directory) throw new Error('--variants needs a directory')

  for (const [name, mark] of Object.entries(VARIANTS)) {
    for (const size of [1024, 128]) {
      const path = `${directory}/${name}-${size}.png`
      await Bun.write(path, draw(size, mark))
      console.log(`✔ ${path}`)
    }
  }
} else {
  const chosen = VARIANTS.outline
  if (!chosen) throw new Error('no such variant')

  const white: Rgb = { r: 255, g: 255, b: 255 }
  // Android masks the foreground hard, so the mark sits well inside the safe area. The
  // notification glyph stays solid: at status-bar size a hairline outline disappears.
  const outputs: [string, number, Mark][] = [
    ['assets/images/icon.png', 1024, chosen],
    [
      'assets/images/adaptive-icon.png',
      1024,
      { background: null, colour: rgb(ACCENT), scale: 0.46, outline: 0.032 },
    ],
    [
      'assets/images/adaptive-icon-mono.png',
      1024,
      { background: null, colour: white, scale: 0.46, outline: 0.032 },
    ],
    [
      'assets/images/splash-icon.png',
      512,
      { background: null, colour: rgb(ACCENT), scale: 0.7, outline: 0.032 },
    ],
    [
      'assets/images/notification-icon.png',
      96,
      { background: null, colour: white, scale: 0.78, outline: null },
    ],
    // The motif the app itself draws, as the icon draws it: one union rather than
    // two overlapping squares, so an outline has no crossing lines inside it and a
    // shaded one has no darker patch where the squares meet. White so `tintColor`
    // can colour it from the palette at render time.
    [
      'assets/images/star-outline.png',
      256,
      { background: null, colour: white, scale: 0.94, outline: 0.032 },
    ],
    [
      'assets/images/star-solid.png',
      256,
      { background: null, colour: white, scale: 0.94, outline: null },
    ],
  ]

  for (const [path, size, mark] of outputs) {
    const png = draw(size, mark)
    await Bun.write(path, png)
    console.log(`✔ ${path} — ${size}×${size}, ${png.length} bytes`)
  }
}
