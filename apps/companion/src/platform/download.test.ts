import { afterEach, beforeEach, expect, it } from 'bun:test'
import { downloadFile } from './download'

const create = URL.createObjectURL
const revoke = URL.revokeObjectURL
const click = HTMLAnchorElement.prototype.click

let blobs: Blob[]
let revoked: string[]
let clicked: { href: string; download: string }[]

beforeEach(() => {
  blobs = []
  revoked = []
  clicked = []
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    blobs.push(blob as Blob)
    return 'blob:fake-1'
  }
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url)
  }
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    clicked.push({ href: this.href, download: this.download })
  }
})

afterEach(() => {
  URL.createObjectURL = create
  URL.revokeObjectURL = revoke
  HTMLAnchorElement.prototype.click = click
})

it('offers the contents as a named JSON download and releases the URL', async () => {
  downloadFile('data.json', '{"a":1}')
  expect(clicked).toEqual([{ href: 'blob:fake-1', download: 'data.json' }])
  expect(blobs[0]?.type).toStartWith('application/json')
  expect(await blobs[0]?.text()).toBe('{"a":1}')
  expect(revoked).toEqual(['blob:fake-1'])
})

it('takes another content type', () => {
  downloadFile('notes.txt', 'hi', 'text/plain')
  expect(blobs[0]?.type).toStartWith('text/plain')
})
