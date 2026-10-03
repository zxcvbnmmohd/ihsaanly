import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { main } from './build-world-map'

const run = (): Promise<void> => main()

type Ring = [number, number][]
const box = (west: number, south: number, east: number, north: number): Ring => [
  [west, north],
  [east, north],
  [east, south],
  [west, south],
  [west, north],
]
/** A hole around a lon/lat, so the point reads as sea. */
const hole = (lon: number, lat: number): Ring => box(lon - 2, lat - 2, lon + 2, lat + 2)

// All the land the script checks is inside the world box; the four sea points are holes in it.
const SEA: [number, number][] = [
  [-160, 0],
  [-40, 30],
  [80, -40],
  [-20, -20],
]
const world = (seaHoles: Ring[]): unknown => ({
  features: [
    { geometry: { type: 'Polygon', coordinates: [box(-180, -90, 180, 90), ...seaHoles] } },
    // A MultiPolygon, drawn on land that is already there.
    {
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[box(0, 40, 10, 50)], [box(100, -10, 110, 0)]],
      },
    },
    // Degenerate geometry the filler must skip: a flat ring and an empty one.
    {
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 10],
            [5, 10],
            [0, 10],
          ],
        ],
      },
    },
    { geometry: { type: 'Polygon', coordinates: [[]] } },
  ],
})

const written: { path: string; data: Uint8Array }[] = []
const logged: string[] = []
const errored: string[] = []
const exits: (number | undefined)[] = []
let response: { ok: boolean; status: number; json: () => Promise<unknown> }
const fetched: string[] = []

beforeEach(() => {
  written.length = logged.length = errored.length = exits.length = fetched.length = 0
  response = {
    ok: true,
    status: 200,
    json: async () => world(SEA.map(([lon, lat]) => hole(lon, lat))),
  }
  spyOn(globalThis, 'fetch').mockImplementation((async (url: string) => {
    fetched.push(url)
    return response
  }) as never)
  spyOn(Bun, 'write').mockImplementation((async (path: string, data: Uint8Array) => {
    written.push({ path, data })
    return data.length
  }) as never)
  spyOn(console, 'log').mockImplementation((...args) => void logged.push(args.join(' ')))
  spyOn(console, 'error').mockImplementation((...args) => void errored.push(args.join(' ')))
  spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code)
    throw new Error('exit')
  }) as never)
})
afterEach(() => mock.restore())

describe('build-world-map', () => {
  it('fetches Natural Earth land and writes a 1440x720 grey+alpha equirectangular PNG', async () => {
    await run()
    expect(fetched).toEqual([
      'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
    ])
    expect(written).toHaveLength(1)
    const [{ path, data }] = written as [(typeof written)[number]]
    expect(path).toBe('../../packages/ui/assets/images/world-equirectangular.png')
    const view = new DataView(data.buffer, data.byteOffset)
    expect(view.getUint32(16)).toBe(1440)
    expect(view.getUint32(20)).toBe(720)
    expect(data[25]).toBe(4) // grey with alpha
    expect(logged[0]).toMatch(
      /^✔ .*world-equirectangular\.png — 1440×720, \d+ bytes, 14 checks passed$/,
    )
  })

  it('puts land where the projection says and sea at the holes', async () => {
    await run()
    const [{ data }] = written as [(typeof written)[number]]
    // IHDR is 25 bytes after the signature+length+type; IDAT follows with its own header.
    const idatLength = new DataView(data.buffer, data.byteOffset).getUint32(33)
    const raw = inflateSync(data.slice(41, 41 + idatLength))
    const alphaAt = (lat: number, lon: number): number => {
      const x = Math.floor(((lon + 180) / 360) * 1440)
      const y = Math.floor(((90 - lat) / 180) * 720)
      return raw[y * (1 + 1440 * 2) + 1 + x * 2 + 1] ?? -1
    }
    expect(alphaAt(51.51, -0.13)).toBe(255) // London
    expect(alphaAt(-33.87, 151.21)).toBe(255) // Sydney
    expect(alphaAt(0, -160)).toBe(0) // mid Pacific
  })

  it('stops when the source cannot be fetched', async () => {
    response = { ok: false, status: 503, json: async () => ({}) }
    await expect(run()).rejects.toThrow('Natural Earth fetch failed: 503')
    expect(written).toEqual([])
  })

  it('fails the projection check, naming every point that is wrong, and writes nothing', async () => {
    // No holes: the sea points read as land. Only the first hole removed would leave 3 wrong.
    response.json = async () => world([])
    await expect(run()).rejects.toThrow('exit')
    expect(exits).toEqual([1])
    expect(errored).toEqual([
      '✖ projection check failed:',
      '  mid Pacific is not at sea',
      '  mid Atlantic is not at sea',
      '  southern Indian is not at sea',
      '  south Atlantic is not at sea',
    ])
    expect(written).toEqual([])
  })

  it('fails when land is missing where a city is', async () => {
    response.json = async () => ({ features: [] })
    await expect(run()).rejects.toThrow('exit')
    expect(errored).toContain('  London is not on land')
    expect(errored).toContain('  Tokyo is not on land')
    expect(errored.some((line) => line.includes('not at sea'))).toBe(false)
  })
})
