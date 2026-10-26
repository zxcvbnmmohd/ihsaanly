import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { EMPTY_DRAFT, MAX_OWN_DUAS } from '@ihsaanly/core/content/my-duas'
import { en } from '@ihsaanly/core/strings/en'
import { writePreference } from '@ihsaanly/state/storage/preferences'
import { act } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { renderScreen } from '../../../../../packages/ui/test/render'
import { router } from '../../../test/router'

type FormProps = ComponentProps<typeof import('@ihsaanly/ui/screens/own-dua-form').OwnDuaFormScreen>

const formProps: FormProps[] = []
mock.module('@ihsaanly/ui/screens/own-dua-form', () => ({
  OwnDuaFormScreen: (props: FormProps): ReactElement => {
    formProps.push(props)
    return <div data-testid="own-dua-form" />
  },
}))

const { default: MyDuaRoute } = await import('../../app/(library)/my-dua')
const { getOwnDuas, saveOwnDua } = await import('@ihsaanly/state/my-duas/store')
const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')

/** Writes the stored list directly, as a sync from another device would. */
function setOwnDuas(list: unknown[]): void {
  writePreference('ownDuas', list)
  reloadPreferences()
}

const last = (): FormProps => {
  const props = formProps.at(-1)
  if (!props) throw new Error('OwnDuaFormScreen did not render')
  return props
}

const saved = {
  id: 'mine-saved',
  title: 'For my parents',
  arabic: null,
  transliteration: null,
  text: 'Have mercy on them',
  repeat: 1,
  moment: 'night' as const,
}

beforeEach(() => {
  formProps.length = 0
})

afterEach(() => act(() => setOwnDuas([])))

describe('writing a new dua', () => {
  it('starts empty, titled for writing', () => {
    renderScreen(<MyDuaRoute />)
    expect(last().draft).toEqual(EMPTY_DRAFT)
    expect(last().problem).toBeNull()
    expect(last().full).toBe(false)
    expect(router.screens.at(-1)).toEqual({ title: en.myDuas.newTitle })
  })

  it('says what is missing only once a save is tried', () => {
    renderScreen(<MyDuaRoute />)
    act(() => last().onSave())
    expect(last().problem).toBe('title')
    act(() => last().onChange({ ...last().draft, title: 'Mine' }))
    expect(last().problem).toBe('words')
    expect(getOwnDuas()).toEqual([])
    expect(router.calls).toEqual([])
  })

  it('saves and opens the new dua', () => {
    renderScreen(<MyDuaRoute />)
    act(() =>
      last().onChange({ ...EMPTY_DRAFT, title: ' Mine ', text: 'Words', moment: 'morning' }),
    )
    act(() => last().onSave())
    const [dua] = getOwnDuas()
    expect(dua).toMatchObject({ title: 'Mine', text: 'Words', moment: 'morning' })
    expect(dua?.id).toStartWith('mine-')
    expect(router.calls).toEqual([['replace', `/item/${dua?.id}`]])
  })

  it('cannot add past the cap, and stays put', () => {
    act(() =>
      setOwnDuas(
        Array.from({ length: MAX_OWN_DUAS }, (_, index) => ({ ...saved, id: `mine-${index}` })),
      ),
    )
    renderScreen(<MyDuaRoute />)
    expect(last().full).toBe(true)
    act(() => last().onChange({ ...EMPTY_DRAFT, title: 'One more', text: 'Words' }))
    act(() => last().onSave())
    expect(getOwnDuas()).toHaveLength(MAX_OWN_DUAS)
    expect(router.calls).toEqual([])
  })
})

describe('editing a dua', () => {
  it('loads it, saves in place and goes back', () => {
    act(() => {
      saveOwnDua(saved)
    })
    router.params = { id: saved.id }
    renderScreen(<MyDuaRoute />)
    expect(router.screens.at(-1)).toEqual({ title: en.myDuas.editTitle })
    expect(last().draft).toMatchObject({ title: saved.title, text: saved.text, moment: 'night' })
    expect(last().full).toBe(false)

    act(() => last().onChange({ ...last().draft, repeat: 3 }))
    act(() => last().onSave())
    expect(getOwnDuas()).toEqual([{ ...saved, repeat: 3 }])
    expect(router.calls).toEqual([['back']])
  })

  it('reloads the draft when another dua is opened in the same place', () => {
    act(() => {
      saveOwnDua(saved)
    })
    router.params = {}
    const view = renderScreen(<MyDuaRoute />)
    act(() => last().onChange({ ...EMPTY_DRAFT, title: 'Half typed' }))
    router.params = { id: saved.id }
    view.rerender(<MyDuaRoute />)
    expect(last().draft.title).toBe(saved.title)
    router.params = {}
    view.rerender(<MyDuaRoute />)
    expect(last().draft).toEqual(EMPTY_DRAFT)
  })
})
