import { expect, test } from 'bun:test'
import { problemsIn } from './single-use-state'

test('flags the shapes it should', () => {
  expect(problemsIn('const [a, setA] = useState(0)\nconst [b, setB] = useState(1)')).toHaveLength(1)
  expect(problemsIn('const [count, setCount] = useState<number>(0)')).toHaveLength(1)
  expect(problemsIn('const [thing, setThing] = useState<Thing>({ a: 1 })')).toEqual([])
  expect(problemsIn("import { useState } from 'react'")).toEqual([])
})
