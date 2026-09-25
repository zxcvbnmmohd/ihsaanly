// Tiny DOM builder so the rest of the demo never touches innerHTML for text
// content. Static, trusted SVG markup is the one exception (see icons.ts).

export interface ElementOptions {
  className?: string
  text?: string
  html?: string
  attrs?: Record<string, string>
  children?: (Node | null)[]
  onClick?: (event: MouseEvent) => void
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (options.className) node.className = options.className
  if (options.text !== undefined) node.textContent = options.text
  if (options.html !== undefined) node.innerHTML = options.html
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) node.setAttribute(key, value)
  }
  if (options.children) {
    for (const child of options.children) if (child) node.appendChild(child)
  }
  if (options.onClick) {
    const onClick = options.onClick
    node.addEventListener('click', (event) => onClick(event as MouseEvent))
  }
  return node
}

export function clear(node: Element): void {
  node.replaceChildren()
}

export function mount(container: Element, ...children: (Node | null)[]): void {
  clear(container)
  for (const child of children) if (child) container.appendChild(child)
}
