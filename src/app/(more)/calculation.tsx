import { setCalculationPreferences, useCalculationPreferences } from '@/prayer/store';
import type { CalculationPreferences } from '@/prayer/calculation';
import { CalculationScreen } from '@/screens/calculation';

export default function CalculationRoute() {
  const preferences = useCalculationPreferences();

  return (
    <CalculationScreen
      preferences={preferences}
      onChange={(change: Partial<CalculationPreferences>) =>
        setCalculationPreferences({ ...preferences, ...change })
      }
    />
  );
}
