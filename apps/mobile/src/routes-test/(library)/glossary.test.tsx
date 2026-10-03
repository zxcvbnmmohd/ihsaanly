import { beforeEach, expect, it, mock } from 'bun:test'
import { terms } from '@ihsaanly/core/content/glossary'
import { render } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { router } from '../../../test/router'

type GlossaryProps = ComponentProps<typeof import('@ihsaanly/ui/screens/glossary').GlossaryScreen>

const captured: GlossaryProps[] = []
mock.module('@ihsaanly/ui/screens/glossary', () => ({
  GlossaryScreen: (props: GlossaryProps): ReactElement => {
    captured.push(props)
    return <div />
  },
}))

const { default: GlossaryRoute } = await import('../../app/(library)/glossary')

beforeEach(() => {
  captured.length = 0
})

it('passes every glossary term with its resolved text and no highlight', () => {
  render(<GlossaryRoute />)
  const props = captured.at(-1)
  expect(props?.highlighted).toBeNull()
  expect(props?.entries).toHaveLength(terms.length)
  expect(props?.entries.map((entry) => entry.id)).toEqual(terms.map((entry) => entry.id))
  expect(
    props?.entries.every((entry) => entry.term.length > 0 && entry.definition.length > 0),
  ).toBe(true)
})

it('highlights the term named in the link', () => {
  router.params = { term: 'sunnah' }
  render(<GlossaryRoute />)
  expect(captured.at(-1)?.highlighted).toBe('sunnah')
})
