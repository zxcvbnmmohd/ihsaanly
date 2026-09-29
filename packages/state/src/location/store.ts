import { Place } from '@ihsaanly/core/location/place'
import { createPreferenceStore } from '../storage/preference-store'

const placeStore = createPreferenceStore<Place | null>('place', Place.nullable(), null)

export const setPlace = placeStore.set
export const usePlace = placeStore.use
export const getPlace = placeStore.get
