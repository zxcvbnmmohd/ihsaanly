import { describe, expect, it, mock } from 'bun:test'
import type { OwnDuaDraft } from '@ihsaanly/core/content/my-duas'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { ownDuaFormFixture } from './fixtures'
import { OwnDuaFormScreen } from './own-dua-form'

describe('OwnDuaFormScreen', () => {
  it('reports every field as it is typed', async () => {
    const onChange = mock((_draft: OwnDuaDraft) => {})
    const { user, strings } = renderScreen(
      <OwnDuaFormScreen {...ownDuaFormFixture} onChange={onChange} />,
    )
    const fields = [
      [strings.myDuas.fieldTitle, 'title'],
      [strings.myDuas.fieldArabic, 'arabic'],
      [strings.myDuas.fieldTransliteration, 'transliteration'],
      [strings.myDuas.fieldText, 'text'],
    ] as const
    for (const [label, key] of fields) {
      await user.type(screen.getByRole('textbox', { name: label }), 'x')
      expect(onChange).toHaveBeenLastCalledWith({
        ...ownDuaFormFixture.draft,
        [key]: `${ownDuaFormFixture.draft[key]}x`,
      })
    }
  })

  it('steps the count and picks a moment, or none', async () => {
    const onChange = mock((_draft: OwnDuaDraft) => {})
    const { user, strings } = renderScreen(
      <OwnDuaFormScreen {...ownDuaFormFixture} onChange={onChange} />,
    )
    await user.click(screen.getByRole('button', { name: `${strings.myDuas.fieldRepeat} +` }))
    expect(onChange).toHaveBeenLastCalledWith({ ...ownDuaFormFixture.draft, repeat: 2 })

    const evening = screen.getByRole('button', { name: strings.myDuas.moment.evening })
    expect(evening).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: strings.myDuas.moment['after-fajr'] }))
    expect(onChange).toHaveBeenLastCalledWith({
      ...ownDuaFormFixture.draft,
      moment: 'after-fajr',
    })
    await user.click(screen.getByRole('button', { name: strings.myDuas.noReminder }))
    expect(onChange).toHaveBeenLastCalledWith({ ...ownDuaFormFixture.draft, moment: null })
    expect(screen.getByText(strings.myDuas.remindDetail)).toBeInTheDocument()
  })

  it('saves', async () => {
    const onSave = mock(() => {})
    const { user, strings } = renderScreen(
      <OwnDuaFormScreen {...ownDuaFormFixture} onSave={onSave} />,
    )
    await user.click(screen.getByRole('button', { name: strings.myDuas.save }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['title', 'needsTitle'],
    ['words', 'needsWords'],
  ] as const)('says what a %s problem needs', (problem, key) => {
    const { strings } = renderScreen(<OwnDuaFormScreen {...ownDuaFormFixture} problem={problem} />)
    expect(screen.getByText(strings.myDuas[key])).toBeInTheDocument()
  })

  it('stops saving once the set is full, and says why', async () => {
    const onSave = mock(() => {})
    const { user, strings } = renderScreen(
      <OwnDuaFormScreen {...ownDuaFormFixture} full problem="title" onSave={onSave} />,
    )
    expect(screen.getByText(strings.myDuas.full)).toBeInTheDocument()
    expect(screen.queryByText(strings.myDuas.needsTitle)).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.myDuas.save }))
    expect(onSave).not.toHaveBeenCalled()
  })
})
