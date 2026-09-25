// Mirrors src/screens/library.tsx: a search field, then results grouped by
// category with a ruling pill and an "On Today" pill.

import { el, mount } from './dom'
import { iconSearch } from './icons'
import type { LibrarySectionView } from './library'
import type { Strings } from '@/strings/en'

export interface LibraryHandlers {
  onOpenItem: (id: string) => void
  onQueryChange: (query: string) => void
}

export function renderLibrary(
  container: HTMLElement,
  sections: LibrarySectionView[],
  query: string,
  strings: Strings,
  handlers: LibraryHandlers,
): void {
  const input = el('input', {
    className: 'demo-search-input',
    attrs: {
      id: 'demo-library-search',
      type: 'search',
      value: query,
      placeholder: strings.library.search,
      'aria-label': strings.library.search,
    },
  })
  input.addEventListener('input', () => handlers.onQueryChange(input.value))

  const search = el('div', {
    className: 'demo-search',
    children: [el('span', { className: 'demo-search-icon', html: iconSearch() }), input],
  })

  const empty = sections.length === 0
  const body = empty
    ? el('p', {
        className: 'demo-quiet-line',
        text: query.trim() ? strings.library.noResults : strings.library.empty,
      })
    : el('div', {
        className: 'demo-library-sections',
        children: sections.map((sectionView) =>
          el('div', {
            className: 'demo-group',
            children: [
              el('p', { className: 'demo-group-title', text: sectionView.categoryLabel }),
              ...sectionView.entries.map((entry) =>
                el('button', {
                  className: 'demo-card demo-library-card',
                  attrs: { type: 'button' },
                  onClick: () => handlers.onOpenItem(entry.id),
                  children: [
                    el('span', { className: 'demo-library-title', text: entry.title }),
                    el('span', {
                      className: 'demo-pill-row',
                      children: [
                        el('span', {
                          className: 'demo-pill demo-pill-emphasis',
                          text: strings.ruling[entry.ruling],
                        }),
                        entry.onToday
                          ? el('span', { className: 'demo-pill', text: strings.library.onToday })
                          : null,
                      ],
                    }),
                  ],
                }),
              ),
            ],
          }),
        ),
      })

  mount(container, el('div', { className: 'demo-screen-pad', children: [search, body] }))
}
