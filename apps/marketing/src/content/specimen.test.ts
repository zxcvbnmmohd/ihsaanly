import { expect, test } from 'bun:test'
import { catalogue } from '~/i18n/messages.server'

const { getSpecimen } = await import('./specimen')
const { specimenDuas } = await import('./specimen.server')

test('getSpecimen returns the duas for the requested language', async () => {
  expect(await getSpecimen({ data: { lang: 'it' } })).toEqual(
    specimenDuas('it', catalogue('it').strings),
  )
})
