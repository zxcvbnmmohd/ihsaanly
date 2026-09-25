// Mirrors src/screens/item.tsx: the Arabic in Amiri, transliteration and
// translation, repeat count, why, how, and the evidence panel with its
// "Awaiting review" state — every item ships with `reviewed: false` today.

import { el, mount } from './dom'
import type { ItemDetailView, ItemPartDetail } from './item-detail'
import type { Strings } from '@/strings/en'

function labelled(label: string, ...children: (Node | null)[]): HTMLElement {
  return el('div', {
    className: 'demo-labelled',
    children: [el('p', { className: 'demo-labelled-title', text: label }), ...children],
  })
}

function partCard(part: ItemPartDetail, strings: Strings): HTMLElement {
  return el('div', {
    className: 'demo-card demo-part-card',
    children: [
      el('div', {
        className: 'demo-part-head',
        children: [
          el('span', { className: 'demo-part-title', text: part.title }),
          part.repeat > 1
            ? el('span', {
                className: 'demo-part-repeat',
                text: strings.item.partRepeat(part.repeat),
              })
            : null,
        ],
      }),
      el('p', {
        className: 'demo-arabic',
        attrs: { lang: 'ar', dir: 'rtl' },
        text: part.arabic,
      }),
      part.transliteration
        ? el('p', { className: 'demo-transliteration', text: part.transliteration })
        : null,
      part.translation ? el('p', { className: 'demo-translation', text: part.translation }) : null,
      el('p', { className: 'demo-footnote', text: part.source }),
    ],
  })
}

export function renderItem(
  container: HTMLElement,
  item: ItemDetailView | null,
  strings: Strings,
): void {
  if (!item) {
    mount(
      container,
      el('div', {
        className: 'demo-screen-pad',
        children: [el('p', { className: 'demo-quiet-line', text: strings.notFound.body })],
      }),
    )
    return
  }

  const header = el('div', {
    className: 'demo-item-header',
    children: [
      el('span', { className: 'demo-ruling-label', text: item.rulingLabel }),
      item.reviewed
        ? null
        : el('span', { className: 'demo-unreviewed', text: `· ${strings.item.unreviewed}` }),
    ],
  })

  const repeatLine =
    item.repeat > 1
      ? el('p', { className: 'demo-footnote', text: strings.item.repeat(item.repeat) })
      : null

  const hero = item.arabic
    ? el('div', {
        className: 'demo-card demo-hero',
        children: [
          el('p', {
            className: 'demo-arabic demo-arabic-hero',
            attrs: { lang: 'ar', dir: 'rtl' },
            text: item.arabic,
          }),
          item.transliteration
            ? el('p', { className: 'demo-transliteration demo-center', text: item.transliteration })
            : null,
          item.translation
            ? el('p', { className: 'demo-translation demo-center', text: item.translation })
            : null,
        ],
      })
    : null

  const parts =
    item.parts.length > 0
      ? labelled(strings.item.parts, ...item.parts.map((part) => partCard(part, strings)))
      : null

  const why = item.why
    ? labelled(strings.item.why, el('p', { className: 'demo-body-text', text: item.why }))
    : null

  const how =
    item.how.length > 0
      ? labelled(
          strings.item.how,
          el('ol', {
            className: 'demo-how-list',
            children: item.how.map((step) => el('li', { text: step })),
          }),
        )
      : null

  const note = item.note
    ? labelled(strings.item.note, el('p', { className: 'demo-footnote', text: item.note }))
    : null

  const evidence = el('div', {
    className: 'demo-labelled',
    children: [
      el('p', { className: 'demo-labelled-title', text: strings.item.evidence }),
      ...item.evidence.map((entry) =>
        el('div', {
          className: 'demo-evidence-entry',
          children: [
            el('p', { className: 'demo-evidence-citation', text: entry.citation }),
            entry.narration
              ? el('p', { className: 'demo-evidence-narration', text: entry.narration })
              : null,
          ],
        }),
      ),
    ],
  })

  mount(
    container,
    el('div', {
      className: 'demo-screen-pad',
      children: [header, repeatLine, hero, parts, why, how, note, evidence],
    }),
  )
}
