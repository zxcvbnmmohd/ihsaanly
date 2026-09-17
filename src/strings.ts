/**
 * Every user-facing string in the app resolves through here.
 *
 * ponytail: a plain frozen object, not an i18n library. Centralising the
 * strings now is what makes #19 (locale machinery + RTL) an additive change
 * instead of a sweep across every screen. Swap this module's internals for a
 * locale-aware lookup there; callers don't change.
 */
export const strings = {
  tabs: {
    today: 'Today',
    library: 'Library',
    more: 'More',
  },
  today: {
    title: 'Today',
    empty: 'Nothing here yet.',
  },
  library: {
    title: 'Library',
    empty: 'Adhkar, duas and sunnah actions will be listed here.',
  },
  more: {
    title: 'More',
    empty: 'History, settings and help will live here.',
  },
  error: {
    title: 'Something went wrong',
    retry: 'Try again',
  },
  notFound: {
    title: 'Not found',
    body: 'That screen does not exist.',
  },
} as const;
