import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { main } from './build-brand-assets'

const run = (...flags: string[]): Promise<void> => main(['bun', 'build-brand-assets.ts', ...flags])

const written = new Map<string, Uint8Array>()
const logged: string[] = []

beforeEach(() => {
  written.clear()
  logged.length = 0
  spyOn(Bun, 'write').mockImplementation((async (path: string, data: Uint8Array) => {
    written.set(path, data)
    return data.length
  }) as never)
  spyOn(console, 'log').mockImplementation((...args) => void logged.push(args.join(' ')))
})
afterEach(() => {
  mock.restore()
})

interface Png {
  width: number
  height: number
  colourType: number
  pixels: Uint8Array
  chunks: string[]
}

function decode(png: Uint8Array): Png {
  expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(png.buffer, png.byteOffset)
  const chunks: string[] = []
  const data: Uint8Array[] = []
  let header = { width: 0, height: 0, colourType: 0 }
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    const type = new TextDecoder().decode(png.slice(at + 4, at + 8))
    const body = png.slice(at + 8, at + 8 + length)
    chunks.push(type)
    if (type === 'IHDR') {
      header = {
        width: view.getUint32(at + 8),
        height: view.getUint32(at + 12),
        colourType: body[9] ?? -1,
      }
    }
    if (type === 'IDAT') data.push(body)
    at += 12 + length
  }
  return { ...header, chunks, pixels: new Uint8Array(inflateSync(data[0] ?? new Uint8Array())) }
}

/** The RGB(A) of one pixel, undoing the filter byte that starts each row. */
function pixelAt(png: Png, x: number, y: number): number[] {
  const stride = png.colourType === 6 ? 4 : 3
  const row = 1 + png.width * stride
  const at = y * row + 1 + x * stride
  return [...png.pixels.slice(at, at + stride)]
}

describe('default run', () => {
  it('writes the app, adaptive, splash, notification and motif images at their sizes', async () => {
    await run()
    const sizes = new Map([...written].map(([path, bytes]) => [path, decode(bytes)]))
    expect([...sizes.keys()]).toEqual([
      'assets/images/icon.png',
      'assets/images/adaptive-icon.png',
      'assets/images/adaptive-icon-mono.png',
      'assets/images/splash-icon.png',
      'assets/images/notification-icon.png',
      '../../packages/ui/assets/images/star-outline.png',
      '../../packages/ui/assets/images/star-solid.png',
    ])
    expect([...sizes.values()].map((png) => png.width)).toEqual([
      1024, 1024, 1024, 512, 96, 256, 256,
    ])
    for (const png of sizes.values()) {
      expect(png.height).toBe(png.width)
      expect(png.chunks).toEqual(['IHDR', 'IDAT', 'IEND'])
    }
    expect(logged).toHaveLength(7)
    expect(logged[0]).toMatch(/^✔ assets\/images\/icon\.png — 1024×1024, \d+ bytes$/)
  }, 60_000)

  it('writes the store icon without an alpha channel and everything else with one', async () => {
    await run()
    expect(decode(written.get('assets/images/icon.png') as Uint8Array).colourType).toBe(2)
    for (const [path, bytes] of written) {
      if (path !== 'assets/images/icon.png') expect(decode(bytes).colourType).toBe(6)
    }
  }, 60_000)

  it('draws the accent star on the wash for the icon, and a transparent corner for the rest', async () => {
    await run()
    const icon = decode(written.get('assets/images/icon.png') as Uint8Array)
    // The corner is wash (top-left is the lighter end), the centre is the accent.
    expect(pixelAt(icon, 0, 0)).toEqual([0xf7, 0xf0, 0xe9])
    expect(pixelAt(icon, 512, 512)).not.toEqual(pixelAt(icon, 0, 0))
    const bottom = pixelAt(icon, 0, 1023)
    expect(bottom[0]).toBeLessThan(0xf7)

    const solid = decode(
      written.get('../../packages/ui/assets/images/star-solid.png') as Uint8Array,
    )
    expect(pixelAt(solid, 0, 0)[3]).toBe(0)
    expect(pixelAt(solid, 128, 128)).toEqual([255, 255, 255, 255])
    // The outlined star is hollow where the solid one is filled.
    const outline = decode(
      written.get('../../packages/ui/assets/images/star-outline.png') as Uint8Array,
    )
    expect(pixelAt(outline, 128, 128)[3]).toBe(0)

    const adaptive = decode(written.get('assets/images/adaptive-icon.png') as Uint8Array)
    expect(pixelAt(adaptive, 0, 0)[3]).toBe(0)
    const mono = decode(written.get('assets/images/adaptive-icon-mono.png') as Uint8Array)
    const edge = mono.width * 0.5
    expect(pixelAt(mono, edge, edge).slice(0, 3)).toEqual([255, 255, 255])
  }, 60_000)
})

describe('--variants', () => {
  it('writes comparison sheets into the given directory and leaves assets alone', async () => {
    await run('--variants', '/scratch')
    expect([...written.keys()].sort()).toEqual(
      ['wash', 'accent', 'outline']
        .flatMap((name) => [128, 1024].map((s) => `/scratch/${name}-${s}.png`))
        .sort(),
    )
    expect(decode(written.get('/scratch/wash-128.png') as Uint8Array).width).toBe(128)
    expect(logged).toContain('✔ /scratch/accent-1024.png')
  }, 60_000)

  it('needs a directory', async () => {
    await expect(run('--variants')).rejects.toThrow('--variants needs a directory')
    expect(written.size).toBe(0)
  })
})
