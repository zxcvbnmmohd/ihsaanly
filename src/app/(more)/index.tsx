import { usePlace } from '@/location/store';
import { useCalculationPreferences } from '@/prayer/store';
import { MoreScreen } from '@/screens/more';
import { strings } from '@/strings';

export default function MoreRoute() {
  const place = usePlace();
  const calculation = useCalculationPreferences();

  return (
    <MoreScreen
      locationHref="/location"
      locationLabel={place?.label ?? strings.location.notSet}
      calculationHref="/calculation"
      calculationLabel={strings.asr[calculation.asr]}
    />
  );
}
