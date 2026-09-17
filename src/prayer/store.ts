import { createPreferenceStore } from '@/storage/preference-store';

import { CalculationPreferences, DEFAULT_CALCULATION_PREFERENCES } from './calculation';

const store = createPreferenceStore(
  'calculation',
  CalculationPreferences,
  DEFAULT_CALCULATION_PREFERENCES,
);

export const setCalculationPreferences = store.set;
export const useCalculationPreferences = store.use;
export const getCalculationPreferences = store.get;
