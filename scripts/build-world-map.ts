/**
 * Rasterises Natural Earth land into the equirectangular mask the onboarding
 * place card draws. Run with `bun scripts/build-world-map.ts`.
 *
 * The whole point is exact bounds: the output covers longitude -180..180 and
 * latitude 90..-90 with no inset, so the component's projection is two
 * divisions and nothing has to be calibrated by eye. The checks at the end
 * fail the script if that ever stops being true.
 */
import { deflateSync } from 'node:zlib'

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
const OUT = 'assets/images/world-equirectangular.png'
const WIDTH = 1440
const HEIGHT = 720
const SUPERSAMPLE = 2

type Ring = [number, number][]

interface Geometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Ring[] | Ring[][]
}

function polygonsOf(geometry: Geometry): Ring[][] {
  return geometry.type === 'MultiPolygon'
    ? (geometry.coordinates as Ring[][])
    : [geometry.coordinates as Ring[]]
}

/** Even-odd scanline fill, which draws a polygon and its holes in one pass. */
function fill(mask: Uint8Array, width: number, height: number, rings: Ring[]): void {
  const edges: [number, number, number, number][] = []
  let top = height
  let bottom = 0

  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const from = ring[i]
      const to = ring[(i + 1) % ring.length]
      if (!from || !to) continue

      const [x0, lat0] = from
      const [x1, lat1] = to
      const y0 = ((90 - lat0) / 180) * height
      const y1 = ((90 - lat1) / 180) * height
      if (y0 === y1) continue

      edges.push([((x0 + 180) / 360) * width, y0, ((x1 + 180) / 360) * width, y1])
      top = Math.min(top, y0, y1)
      bottom = Math.max(bottom, y0, y1)
    }
  }
  if (edges.length === 0) return

  for (let y = Math.max(0, Math.floor(top)); y < Math.min(height, Math.ceil(bottom) + 1); y += 1) {
    const centre = y + 0.5
    const crossings: number[] = []

    for (const [x0, y0, x1, y1] of edges) {
      const spans = (y0 <= centre && centre < y1) || (y1 <= centre && centre < y0)
      if (spans) crossings.push(x0 + ((centre - y0) * (x1 - x0)) / (y1 - y0))
    }
    if (crossings.length === 0) continue

    crossings.sort((a, b) => a - b)
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.round(crossings[i] ?? 0))
      const to = Math.min(width, Math.round(crossings[i + 1] ?? 0))
      mask.fill(255, y * width + from, y * width + to)
    }
  }
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

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`Natural Earth fetch failed: ${response.status}`)
const collection = (await response.json()) as { features: { geometry: Geometry }[] }

const renderWidth = WIDTH * SUPERSAMPLE
const renderHeight = HEIGHT * SUPERSAMPLE
const mask = new Uint8Array(renderWidth * renderHeight)
for (const feature of collection.features) {
  for (const rings of polygonsOf(feature.geometry)) {
    fill(mask, renderWidth, renderHeight, rings)
  }
}

const alpha = new Uint8Array(WIDTH * HEIGHT)
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    let total = 0
    for (let dy = 0; dy < SUPERSAMPLE; dy += 1) {
      const base = (y * SUPERSAMPLE + dy) * renderWidth + x * SUPERSAMPLE
      for (let dx = 0; dx < SUPERSAMPLE; dx += 1) total += mask[base + dx] ?? 0
    }
    alpha[y * WIDTH + x] = Math.round(total / (SUPERSAMPLE * SUPERSAMPLE))
  }
}

/** The map is only useful if the projection lands where it claims. */
const at = (lat: number, lon: number): number => {
  const x = Math.min(WIDTH - 1, Math.floor(((lon + 180) / 360) * WIDTH))
  const y = Math.min(HEIGHT - 1, Math.floor(((90 - lat) / 180) * HEIGHT))
  return alpha[y * WIDTH + x] ?? 0
}

const LAND: [string, number, number][] = [
  ['London', 51.51, -0.13],
  ['Toronto', 43.7, -79.42],
  ['Jakarta', -6.21, 106.85],
  ['Cape Town', -33.92, 18.42],
  ['Sydney', -33.87, 151.21],
  ['Riyadh', 24.71, 46.68],
  ['Tokyo', 35.68, 139.69],
  ['Lima', -12.05, -77.04],
  ['Cairo', 30.04, 31.24],
  ['Moscow', 55.76, 37.62],
]
const SEA: [string, number, number][] = [
  ['mid Pacific', 0, -160],
  ['mid Atlantic', 30, -40],
  ['southern Indian', -40, 80],
  ['south Atlantic', -20, -20],
]

const failures = [
  ...LAND.filter(([, lat, lon]) => at(lat, lon) <= 100).map(([name]) => `${name} is not on land`),
  ...SEA.filter(([, lat, lon]) => at(lat, lon) >= 100).map(([name]) => `${name} is not at sea`),
]
if (failures.length > 0) {
  console.error('✖ projection check failed:')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

const raw = new Uint8Array(HEIGHT * (1 + WIDTH * 2))
let cursor = 0
for (let y = 0; y < HEIGHT; y += 1) {
  raw[cursor] = 0
  cursor += 1
  for (let x = 0; x < WIDTH; x += 1) {
    raw[cursor] = 0
    raw[cursor + 1] = alpha[y * WIDTH + x] ?? 0
    cursor += 2
  }
}

const header = new Uint8Array(13)
const headerView = new DataView(header.buffer)
headerView.setUint32(0, WIDTH)
headerView.setUint32(4, HEIGHT)
header.set([8, 4, 0, 0, 0], 8)

const png = new Uint8Array([
  ...[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ...chunk('IHDR', header),
  ...chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
  ...chunk('IEND', new Uint8Array()),
])

await Bun.write(OUT, png)
console.log(
  `✔ ${OUT} — ${WIDTH}×${HEIGHT}, ${png.length} bytes, ${LAND.length + SEA.length} checks passed`,
)
