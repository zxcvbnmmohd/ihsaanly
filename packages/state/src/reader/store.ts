import { DEFAULT_READER_PREFERENCES, type ReaderPreferences } from '@ihsaanly/core/content/reading'
import { z } from 'zod'
import { READER_KEY } from '../cloud/keys'
import { createPreferenceStore } from '../storage/preference-store'

const StoredReaderPreferences: z.ZodType<ReaderPreferences> = z.object({
  arabicFirst: z.boolean(),
  align: z.enum(['start', 'center']),
  detail: z.enum(['brief', 'detailed']),
})

const store = createPreferenceStore(READER_KEY, StoredReaderPreferences, DEFAULT_READER_PREFERENCES)

export const getReaderPreferences = store.get
export const useReaderPreferences = store.use

/** Changes some of the reader preferences and keeps the rest. */
export function updateReaderPreferences(change: Partial<ReaderPreferences>): void {
  store.set({ ...store.get(), ...change })
}
