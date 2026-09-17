import type { ReactElement } from 'react';
import { useHijriDate } from '@/hijri/use-hijri-date';
import { setHijriOffset, useHijriOffset } from '@/hijri/store';
import { HijriScreen } from '@/screens/hijri';

export default function HijriRoute(): ReactElement {
  const offset = useHijriOffset();
  const preview = useHijriDate();

  return <HijriScreen offset={offset} preview={preview} onChange={setHijriOffset} />;
}
