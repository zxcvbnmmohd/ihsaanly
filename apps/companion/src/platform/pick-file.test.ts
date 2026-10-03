import { afterEach, expect, it } from 'bun:test'
import { pickFile } from './pick-file'

const click = HTMLInputElement.prototype.click

afterEach(() => {
  HTMLInputElement.prototype.click = click
})

/** Makes the next picker "choose" `files` as soon as it is opened. */
function choose(files: unknown[] | null, accepted: string[] = []): void {
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    accepted.push(`${this.type}:${this.accept}`)
    Object.defineProperty(this, 'files', { value: files })
    this.onchange?.(new Event('change'))
  }
}

it('resolves the text of the chosen file from a file input with the given accept', async () => {
  const accepted: string[] = []
  choose([new File(['{"ok":true}'], 'a.json')], accepted)
  expect(await pickFile('application/json')).toBe('{"ok":true}')
  expect(accepted).toEqual(['file:application/json'])
})

it('resolves null when nothing was chosen', async () => {
  choose([])
  expect(await pickFile('*/*')).toBeNull()
  choose(null)
  expect(await pickFile('*/*')).toBeNull()
})

it('resolves null when the file cannot be read', async () => {
  choose([{ text: () => Promise.reject(new Error('unreadable')) }])
  expect(await pickFile('*/*')).toBeNull()
})
