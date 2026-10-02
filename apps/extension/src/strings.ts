import { en } from '@ihsaanly/core/strings/en'
import { type Strings, useStrings } from '@ihsaanly/state/strings'

/**
 * The shared tables speak of "this phone"; the popup's screens get these
 * instead, through the UI provider.
 *
 * ponytail: English only. Other languages keep their phone wording until a
 * host-neutral string lands in every table in packages/core/src/strings.
 */
const browserEn: Strings = {
  ...en,
  today: {
    ...en.today,
    needsLocation:
      'Prayer windows, the Hijri date and everything the day asks of you follow from a rough location. It is worked out in this browser and stays there unless you sign in to sync.',
  },
  location: {
    ...en.location,
    useDeviceDetail: 'Stays in this browser unless you sign in to sync.',
  },
}

export function useExtensionStrings(): Strings {
  const strings = useStrings()
  return strings === en ? browserEn : strings
}
