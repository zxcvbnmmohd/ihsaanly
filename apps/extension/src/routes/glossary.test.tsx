import { beforeEach, describe, expect, it } from 'bun:test'
import { resolveText } from '@ihsaanly/core/content'
import { terms } from '@ihsaanly/core/content/glossary'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

const termText = (index: number): string => {
  const entry = terms[index]
  return resolveText(entry?.term) ?? entry?.id ?? ''
}

describe('/glossary', () => {
  it('lists every term with its definition', async () => {
    await renderRoute('/glossary')
    expect(await screen.findByRole('heading', { name: strings.glossary.title })).toBeInTheDocument()
    expect(terms.length).toBeGreaterThan(2)
    for (const entry of terms) {
      const definition = resolveText(entry.definition)
      if (definition) expect(screen.getAllByText(definition).length).toBeGreaterThan(0)
    }
  })

  it('puts the term from ?term= first', async () => {
    const last = terms.length - 1
    await renderRoute(`/glossary?term=${terms[last]?.id}`)
    const highlighted = await screen.findByText(termText(last))
    const first = screen.getByText(termText(0))
    expect(
      highlighted.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
