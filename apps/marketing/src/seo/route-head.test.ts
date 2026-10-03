import { describe, expect, test } from 'bun:test'
import { localeFor, PAGES } from '~/i18n/locales'
import { catalogue } from '~/i18n/messages.server'
import { pageHead } from './head'
import { headFrom } from './route-head'

const strings = catalogue('en').strings

describe('headFrom', () => {
  test('builds the page head from the messages a parent route loaded', () => {
    const matches = [
      { loaderData: undefined },
      { loaderData: { messages: { strings, offers: null } } },
    ]
    expect(headFrom(matches, PAGES.home, localeFor('en'))).toEqual(
      pageHead(PAGES.home, localeFor('en'), strings),
    )
  })

  test('is empty when no match loaded messages', () => {
    expect(
      headFrom(
        [{ loaderData: { other: 1 } }, {}, { loaderData: null }],
        PAGES.home,
        localeFor('en'),
      ),
    ).toEqual({})
  })
})
