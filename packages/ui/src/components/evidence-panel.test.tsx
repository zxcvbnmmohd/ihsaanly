import { describe, expect, it } from 'bun:test'
import type { Evidence } from '@ihsaanly/core/content/schema'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { itemFixture } from '../screens/fixtures'
import { EvidencePanel } from './evidence-panel'

describe('EvidencePanel', () => {
  it('cites a hadith with grading and grader, and a Quran verse', () => {
    const { strings } = renderScreen(<EvidencePanel evidence={itemFixture.evidence} />)
    expect(screen.getByRole('heading', { name: strings.item.evidence })).toBeInTheDocument()
    expect(
      screen.getByText(
        `Sunan Abi Dawud 5095 · ${strings.grading.sahih} — ${strings.item.gradedBy('al-Albani')}`,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(strings.item.quranReference(2, 255))).toBeInTheDocument()
    expect(screen.getByText('A narration.')).toBeInTheDocument()
    expect(screen.getByText('A verse.')).toBeInTheDocument()
  })

  it('leaves out the grader and the narration when there are none', () => {
    const evidence: Evidence[] = [
      {
        type: 'hadith',
        collection: 'Sahih Muslim',
        reference: '2692',
        grading: 'sahih',
        gradedBy: null,
        text: {},
      },
    ]
    const { strings } = renderScreen(<EvidencePanel evidence={evidence} />)
    expect(screen.getByText(`Sahih Muslim 2692 · ${strings.grading.sahih}`)).toBeInTheDocument()
  })
})
