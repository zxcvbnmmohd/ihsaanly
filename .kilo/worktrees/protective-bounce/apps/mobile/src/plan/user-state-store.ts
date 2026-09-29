import { DEFAULT_USER_STATE, UserState } from '@ihsaanly/core/plan/user-state'
import { createPreferenceStore } from '@/storage/preference-store'

const store = createPreferenceStore('userState', UserState, DEFAULT_USER_STATE)

export const setUserState = store.set
export const useUserState = store.use
export const getUserState = store.get
