import '../../../test/more'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { content } from '@ihsaanly/core/content'
import { render } from '@testing-library/react'
import { Linking, Platform } from 'react-native'
import { last, mockScreen } from '../../../test/more'

interface Link {
  destination: string
  onPress: () => void
}
interface Props {
  version: string
  build: string | null
  itemCount: number
  reviewedBy: unknown
  donate: Link | null
  privacy: Link
  terms: Link
  licences: (Link & { label: string })[]
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/about', 'AboutScreen')

const constants: {
  expoConfig: { version?: string } | null
  nativeApplicationVersion: string | null
  nativeBuildVersion: string | null
} = { expoConfig: { version: '1.2.3' }, nativeApplicationVersion: '9.9', nativeBuildVersion: '42' }
mock.module('expo-constants', () => ({ default: constants }))

const { default: AboutRoute } = await import('../../app/(more)/about')
const { LEGAL_URLS } = await import('@/cloud')
const { getStrings } = await import('@ihsaanly/state/strings')

const opened: string[] = []
const realOpen = Linking.openURL
const realOS = Platform.OS

describe('about route', () => {
  beforeEach(() => {
    renders.length = 0
    opened.length = 0
    constants.expoConfig = { version: '1.2.3' }
    constants.nativeApplicationVersion = '9.9'
    Linking.openURL = async (url: string) => void opened.push(url)
  })

  afterEach(() => {
    Linking.openURL = realOpen
    ;(Platform as { OS: string }).OS = realOS
  })

  it('shows the version, build and content facts', () => {
    render(<AboutRoute />)
    const props = last(renders)
    expect(props.version).toBe('1.2.3')
    expect(props.build).toBe('42')
    expect(props.itemCount).toBe(content.items.length)
    expect(props.reviewedBy).toBe(content.reviewedBy)
  })

  it('falls back to the native version, then to zero', () => {
    constants.expoConfig = null
    render(<AboutRoute />)
    expect(last(renders).version).toBe('9.9')
    constants.nativeApplicationVersion = null
    render(<AboutRoute />)
    expect(last(renders).version).toBe('0')
  })

  it('opens the legal pages, named without their scheme', () => {
    render(<AboutRoute />)
    const { privacy, terms } = last(renders)
    expect(privacy.destination).toBe(LEGAL_URLS.privacy.replace('https://', ''))
    expect(terms.destination).toBe(LEGAL_URLS.terms.replace('https://', ''))
    privacy.onPress()
    terms.onPress()
    expect(opened).toEqual([LEGAL_URLS.privacy, LEGAL_URLS.terms])
  })

  it('lists the licences, with the localised GeoNames credit last', () => {
    render(<AboutRoute />)
    const { licences } = last(renders)
    expect(licences.map((l) => l.label)).toEqual([
      'Amiri font (SIL Open Font Licence)',
      'Natural Earth map data',
      getStrings().about.geonames,
    ])
    licences.forEach((licence) => licence.onPress())
    expect(opened).toEqual([
      'https://openfontlicense.org',
      'https://www.naturalearthdata.com/about/terms-of-use/',
      'https://www.geonames.org/about.html',
    ])
  })

  it('offers a donation link on Android only', () => {
    render(<AboutRoute />)
    expect(last(renders).donate).toBeNull()

    ;(Platform as { OS: string }).OS = 'android'
    render(<AboutRoute />)
    const { donate } = last(renders)
    expect(donate?.destination).toBe('donate.ihsaanly.app')
    donate?.onPress()
    expect(opened).toEqual(['https://donate.ihsaanly.app'])
  })
})
