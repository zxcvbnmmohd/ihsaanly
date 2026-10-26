import {
  draftOf,
  draftProblem,
  EMPTY_DRAFT,
  fromDraft,
  MAX_OWN_DUAS,
  newOwnDuaId,
  type OwnDuaDraft,
} from '@ihsaanly/core/content/my-duas'
import { ownDuaById, saveOwnDua, useOwnDuas } from '@ihsaanly/state/my-duas/store'
import { useStrings } from '@ihsaanly/state/strings'
import { OwnDuaFormScreen } from '@ihsaanly/ui/screens/own-dua-form'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { type ReactElement, useState } from 'react'

interface Thing {
  draft: OwnDuaDraft
  /** A save was tried, so what is missing is now worth saying. */
  tried: boolean
  /** The dua the draft was loaded from, so opening another one reloads it. */
  loadedFor: string | null
}

/** `/my-dua` writes a new dua; `/my-dua?id=mine-…` edits one. */
export default function MyDuaRoute(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const strings = useStrings()
  const own = useOwnDuas()
  const existing = id ? ownDuaById(own, id) : null
  const [thing, setThing] = useState<Thing>({
    draft: existing ? draftOf(existing) : EMPTY_DRAFT,
    tried: false,
    loadedFor: id ?? null,
  })

  if ((id ?? null) !== thing.loadedFor) {
    setThing({
      draft: existing ? draftOf(existing) : EMPTY_DRAFT,
      tried: false,
      loadedFor: id ?? null,
    })
  }

  const problem = draftProblem(thing.draft)

  const save = (): void => {
    if (problem) {
      setThing((current) => ({ ...current, tried: true }))
      return
    }
    const dua = fromDraft(thing.draft, existing?.id ?? newOwnDuaId(Date.now(), Math.random()))
    if (!saveOwnDua(dua)) return
    // A new dua opens in its own reader; an edit goes back to it.
    if (existing) router.back()
    else router.replace(`/item/${dua.id}`)
  }

  return (
    <>
      <Stack.Screen
        options={{ title: existing ? strings.myDuas.editTitle : strings.myDuas.newTitle }}
      />
      <OwnDuaFormScreen
        draft={thing.draft}
        onChange={(draft) => setThing((current) => ({ ...current, draft }))}
        problem={thing.tried ? problem : null}
        full={!existing && own.length >= MAX_OWN_DUAS}
        onSave={save}
      />
    </>
  )
}
