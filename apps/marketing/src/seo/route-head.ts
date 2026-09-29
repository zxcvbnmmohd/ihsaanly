import type { Locale, Page } from '~/i18n/locales'
import type { Messages } from '~/i18n/messages'
import { pageHead } from './head'

function hasMessages(value: unknown): value is { messages: Messages } {
  return typeof value === 'object' && value !== null && 'messages' in value
}

/** A page's head, built from the messages its language layout loaded. */
export function headFrom(
  matches: readonly { loaderData?: unknown }[],
  page: Page,
  locale: Locale,
): ReturnType<typeof pageHead> | Record<string, never> {
  const messages = matches.map((match) => match.loaderData).find(hasMessages)?.messages
  return messages ? pageHead(page, locale, messages.strings) : {}
}
