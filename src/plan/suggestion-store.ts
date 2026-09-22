import { createPreferenceStore } from '@/storage/preference-store'

import { DEFAULT_SUGGESTION, SuggestionState } from './suggest'

const store = createPreferenceStore('suggestion', SuggestionState, DEFAULT_SUGGESTION)

export const setSuggestion = store.set
export const useSuggestion = store.use
export const getSuggestion = store.get
