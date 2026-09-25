// Mirrors src/screens/today.tsx: the prayer strip, the "right now" card, what
// comes before/after the next prayer, and the look-ahead sections — in that
// order, with the same section captions.

import { el, mount } from './dom'
import { iconCheck } from './icons'
import type { PrayerEntry, TodayEntry, TodayViewModel } from './engine'
import type { Prayer } from '@/prayer/qada'
import type { Strings } from '@/strings/en'

export interface TodayHandlers {
  onMarkPrayer: (prayer: Prayer) => void
  onOpenItem: (id: string) => void
}

function section(title: string, ...children: (Node | null)[]): HTMLElement {
  return el('div', {
    className: 'demo-group',
    children: [el('p', { className: 'demo-group-title', text: title }), ...children],
  })
}

function row(entry: TodayEntry, onOpenItem: (id: string) => void): HTMLElement {
  return el('button', {
    className: 'demo-row',
    attrs: { type: 'button' },
    onClick: () => onOpenItem(entry.id),
    children: [
      el('span', { className: 'demo-row-title', text: entry.title }),
      entry.detail ? el('span', { className: 'demo-row-detail', text: entry.detail }) : null,
    ],
  })
}

function rightNowCard(entry: TodayEntry, onOpenItem: (id: string) => void): HTMLElement {
  return el('button', {
    className: 'demo-card demo-card-right-now',
    attrs: { type: 'button' },
    onClick: () => onOpenItem(entry.id),
    children: [
      el('span', { className: 'demo-card-accent-bar' }),
      el('span', {
        className: 'demo-card-body',
        children: [
          el('span', { className: 'demo-card-title', text: entry.title }),
          entry.detail ? el('span', { className: 'demo-card-detail', text: entry.detail }) : null,
        ],
      }),
    ],
  })
}

/** Each entry carries its own name, so Friday's strip reads Jumu'ah without asking the table. */
function prayerStrip(prayers: PrayerEntry[], onMark: (prayer: Prayer) => void): HTMLElement {
  const chips = prayers.map((entry) =>
    el('button', {
      className: `demo-prayer${entry.done ? ' is-done' : ''}${entry.passed && !entry.done ? ' is-passed' : ''}`,
      attrs: {
        type: 'button',
        role: 'checkbox',
        'aria-checked': String(entry.done),
        'aria-label': entry.name,
      },
      onClick: () => onMark(entry.prayer),
      children: [
        el('span', {
          className: 'demo-prayer-mark',
          html: entry.done ? iconCheck() : '',
        }),
        el('span', { className: 'demo-prayer-label', text: entry.name }),
      ],
    }),
  )

  return el('div', { className: 'demo-prayer-strip', children: chips })
}

function upNextCard(
  model: TodayViewModel,
  strings: Strings,
  onOpenItem: (id: string) => void,
): HTMLElement | null {
  const { next } = model
  if (!next || (next.before.length === 0 && next.after.length === 0)) return null

  const list = (title: string, entries: TodayEntry[]): HTMLElement | null =>
    entries.length > 0
      ? el('div', {
          className: 'demo-up-next-group',
          children: [
            el('p', { className: 'demo-up-next-label', text: title }),
            ...entries.map((entry) =>
              el('button', {
                className: 'demo-up-next-row',
                attrs: { type: 'button' },
                onClick: () => onOpenItem(entry.id),
                text: entry.title,
              }),
            ),
          ],
        })
      : null

  return el('div', {
    className: 'demo-card',
    children: [
      el('span', {
        className: 'demo-card-title',
        text: next.name,
      }),
      el('span', { className: 'demo-up-next-distance', text: next.distance }),
      list(strings.plan.before, next.before),
      list(strings.plan.after, next.after),
    ],
  })
}

export function renderToday(
  container: HTMLElement,
  model: TodayViewModel,
  strings: Strings,
  handlers: TodayHandlers,
): void {
  const dateLine = el('p', {
    className: 'demo-date-line',
    text: [model.gregorian, model.hijri, model.placeLabel].filter(Boolean).join(' · '),
  })

  const prayers = section(strings.plan.prayers, prayerStrip(model.prayers, handlers.onMarkPrayer))

  const rightNow = model.rightNow
    ? section(strings.plan.rightNow, rightNowCard(model.rightNow, handlers.onOpenItem))
    : null

  const alsoNow =
    model.alsoNow.length > 0
      ? section(
          strings.plan.alsoNow,
          ...model.alsoNow.map((entry) => row(entry, handlers.onOpenItem)),
        )
      : null

  const nothingElse = model.nothingElse
    ? el('p', { className: 'demo-quiet-line', text: strings.today.nothingElse })
    : null

  const upNext = upNextCard(model, strings, handlers.onOpenItem)
  const upNextSection = upNext ? section(strings.plan.upNext, upNext) : null

  const allDay =
    model.allDay.length > 0
      ? section(
          strings.plan.alsoToday,
          ...model.allDay.map((entry) => row(entry, handlers.onOpenItem)),
        )
      : null

  const tomorrow =
    model.tomorrow.length > 0
      ? section(
          strings.plan.tomorrow,
          ...model.tomorrow.map((entry) => row(entry, handlers.onOpenItem)),
        )
      : null

  const later =
    model.later.length > 0
      ? section(
          strings.plan.comingUp,
          ...model.later.map((entry) => row(entry, handlers.onOpenItem)),
        )
      : null

  const footnote = el('p', { className: 'demo-footnote', text: strings.hijri.approximate })

  mount(
    container,
    el('div', {
      className: 'demo-screen-pad',
      children: [
        dateLine,
        prayers,
        rightNow,
        alsoNow,
        nothingElse,
        upNextSection,
        allDay,
        tomorrow,
        later,
        footnote,
      ],
    }),
  )
}
