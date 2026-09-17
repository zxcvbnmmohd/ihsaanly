import { z } from 'zod';

import { createPreferenceStore } from '@/storage/preference-store';

import { MAXIMUM_OFFSET, MINIMUM_OFFSET } from './calendar';

const HijriOffset = z.number().int().min(MINIMUM_OFFSET).max(MAXIMUM_OFFSET);

const store = createPreferenceStore('hijriOffset', HijriOffset, 0);

export const setHijriOffset = store.set;
export const useHijriOffset = store.use;
export const getHijriOffset = store.get;
