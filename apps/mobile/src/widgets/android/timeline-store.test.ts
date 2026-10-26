import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

import { fileSystemModule, files } from '../../../test/file-system'
import type { WidgetModel } from '../model'
import sample from '../sample.json'

const NAME = 'widget-timeline.json'
const disk = {
  get content(): string | null {
    return files.contents.get(NAME) ?? null
  },
  set content(value: string | null) {
    if (value === null) files.contents.delete(NAME)
    else files.contents.set(NAME, value)
  },
  set throwOnRead(value: boolean) {
    files.unreadable = value
  },
}

function installFileSystem(): void {
  mock.module('expo-file-system', fileSystemModule)
}

installFileSystem()
// Query-suffixed so this copy binds to the file system fake above.
const storeFile = './timeline-store.ts?actual'
const { SAMPLE_ENTRY, entryAt, readTimeline, writeTimeline }: typeof import('./timeline-store') =
  await import(storeFile)

beforeAll(installFileSystem)
beforeEach(() => {
  disk.content = null
  disk.throwOnRead = false
})

function entry(at: number): WidgetModel {
  return { ...structuredClone(sample), at }
}

describe('timeline store', () => {
  it('writes the timeline as JSON in the documents directory and reads it back', async () => {
    const timeline = [entry(1), entry(2)]
    await writeTimeline(timeline)
    expect(files.dir).toBe('file:///documents')
    expect(JSON.parse(disk.content ?? '')).toEqual(timeline)
    expect(await readTimeline()).toEqual(timeline)
  })

  it('reads null before anything was published', async () => {
    expect(await readTimeline()).toBeNull()
  })

  it('reads null when the file is unreadable or not JSON', async () => {
    disk.content = '{ not json'
    expect(await readTimeline()).toBeNull()
    disk.content = '[]'
    disk.throwOnRead = true
    expect(await readTimeline()).toBeNull()
  })

  it('reads null when the JSON is not a timeline', async () => {
    for (const bad of [
      '{"at":1}',
      '"text"',
      'null',
      '[1]',
      '[null]',
      '[{"at":"1","ink":{},"labels":{}}]',
      '[{"at":1,"labels":{}}]',
      '[{"at":1,"ink":{}}]',
    ]) {
      disk.content = bad
      expect(await readTimeline()).toBeNull()
    }
  })

  it('accepts an empty timeline', async () => {
    disk.content = '[]'
    expect(await readTimeline()).toEqual([])
  })
})

describe('entryAt', () => {
  const timeline = [entry(100), entry(200), entry(300)]

  it('is the sample when nothing is published or the timeline is empty', () => {
    expect(entryAt(null, 1)).toBe(SAMPLE_ENTRY)
    expect(entryAt([], 1)).toBe(SAMPLE_ENTRY)
    expect(SAMPLE_ENTRY.stale).toBe(false)
  })

  it('is the last entry that has begun', () => {
    expect(entryAt(timeline, 100).at).toBe(100)
    expect(entryAt(timeline, 199).at).toBe(100)
    expect(entryAt(timeline, 200).at).toBe(200)
    expect(entryAt(timeline, 10_000).at).toBe(300)
  })

  it('is the first entry when the clock is set back', () => {
    expect(entryAt(timeline, 5).at).toBe(100)
  })

  it('is the stale entry past the end of the timeline', () => {
    const ended = [entry(100), { ...entry(200), stale: true }]
    expect(entryAt(ended, 250).stale).toBe(true)
    expect(entryAt(ended, 150).stale).toBe(false)
  })
})
