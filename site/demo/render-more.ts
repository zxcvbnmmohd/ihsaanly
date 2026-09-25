// The More tab exists so the tab bar reads honestly as three tabs, the same
// shape as the app. It carries none of the app's own settings — Location,
// Prayer calculation, Reminders, Your data and the rest — which is stated
// plainly rather than faked.

import { el, mount } from './dom'

export function renderMore(container: HTMLElement, body: string): void {
  mount(
    container,
    el('div', {
      className: 'demo-screen-pad',
      children: [
        el('p', {
          className: 'demo-quiet-line',
          text: body,
        }),
      ],
    }),
  )
}
