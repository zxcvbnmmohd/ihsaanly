import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { offendersUnder, problemsIn } from './single-use-state'

describe('problemsIn', () => {
  test('flags more than one useState', () => {
    const problems = problemsIn('const [a, setA] = useState(0)\nconst [b, setB] = useState(1)')
    expect(problems).toEqual(['more than one useState; combine them into one Thing object'])
  })

  test('flags a lone useState not written in the Thing shape', () => {
    expect(problemsIn('const [count, setCount] = useState<number>(0)')).toEqual([
      'write it as const [thing, setThing] = useState<Thing>(…)',
    ])
  })

  test('accepts the canonical form and files without useState', () => {
    expect(problemsIn('const [thing, setThing] = useState<Thing>({ a: 1 })')).toEqual([])
    expect(problemsIn("import { useState } from 'react'")).toEqual([])
    expect(problemsIn('')).toEqual([])
  })
})

describe('offendersUnder', () => {
  const root = mkdtempSync(join(tmpdir(), 'single-use-state-'))
  mkdirSync(join(root, 'src'))
  writeFileSync(join(root, 'src/good.tsx'), 'const [thing, setThing] = useState<Thing>({})')
  writeFileSync(join(root, 'src/bad.ts'), 'const [n, setN] = useState(0)')
  writeFileSync(join(root, 'other.ts'), 'const [n, setN] = useState(0)')
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test('lists offending files under the default pattern as "path: problem"', async () => {
    expect(await offendersUnder(root)).toEqual([
      'src/bad.ts: write it as const [thing, setThing] = useState<Thing>(…)',
    ])
  })

  test('honours a custom pattern', async () => {
    expect(await offendersUnder(root, '*.ts')).toEqual([
      'other.ts: write it as const [thing, setThing] = useState<Thing>(…)',
    ])
  })
})
