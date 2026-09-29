// Strings may carry a little inline markup: <a href>, <strong>, <em> and <br>.
// It is turned into React elements here, never set as HTML, so a translation
// can never inject markup. Anything else is shown as text.
import { Fragment, type ReactNode } from 'react'

const TAG = /<(\/?)([a-zA-Z]+)([^>]*)>/g
const SAFE_HREF = /^(https:\/\/|mailto:|\/|#)/

/** Fills {name} placeholders from the page's link values. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) => values[name] ?? whole)
}

/** Text with tags dropped: for attributes, titles and meta tags. */
export function plain(text: string): string {
  return text.replace(TAG, '')
}

interface Frame {
  tag: 'root' | 'a' | 'strong' | 'em'
  href?: string
  children: ReactNode[]
}

function close(frame: Frame, key: number): ReactNode {
  const children = frame.children
  if (frame.tag === 'a')
    return (
      <a key={key} href={frame.href}>
        {children}
      </a>
    )
  if (frame.tag === 'strong') return <strong key={key}>{children}</strong>
  if (frame.tag === 'em') return <em key={key}>{children}</em>
  return <Fragment key={key}>{children}</Fragment>
}

export function rich(text: string): ReactNode {
  const stack: Frame[] = [{ tag: 'root', children: [] }]
  const top = (): Frame => stack[stack.length - 1] ?? { tag: 'root', children: [] }
  let last = 0
  let key = 0
  for (const match of text.matchAll(TAG)) {
    const [whole, closing, rawName, rest] = match
    const name = (rawName ?? '').toLowerCase()
    top().children.push(text.slice(last, match.index))
    last = match.index + whole.length
    if (name === 'br') {
      top().children.push(<br key={key++} />)
    } else if (name === 'a' || name === 'strong' || name === 'em') {
      if (closing) {
        const frame = stack.length > 1 ? stack.pop() : undefined
        if (frame) top().children.push(close(frame, key++))
      } else {
        const href = /href="([^"]*)"/.exec(rest ?? '')?.[1] ?? ''
        stack.push({ tag: name, href: SAFE_HREF.test(href) ? href : '#', children: [] })
      }
    } else {
      top().children.push(whole)
    }
  }
  top().children.push(text.slice(last))
  while (stack.length > 1) {
    const frame = stack.pop()
    if (frame) top().children.push(close(frame, key++))
  }
  return <>{stack[0]?.children}</>
}
