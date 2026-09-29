import { setEventSettings, useEventSettings } from '@ihsaanly/state/events/store'
import { usePlace } from '@ihsaanly/state/location/store'
import { useStrings } from '@ihsaanly/state/strings'
import { EventsScreen } from '@ihsaanly/ui/screens/events'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/events')({ component: EventsRoute })

/**
 * "Noticing when you get home" needs a background-location geofence
 * (capabilities.homeDetection is off on web — no such API in a browser tab).
 * The toggle still saves a preference so it carries over on export/import,
 * it simply never starts any monitoring here.
 */
function EventsRoute(): ReactElement {
  const strings = useStrings()
  const settings = useEventSettings()
  const place = usePlace()

  const toggleDetectHome = (): void => {
    setEventSettings({ ...settings, detectHome: !settings.detectHome })
  }

  const setHome = (): void => {
    if (!place) return
    setEventSettings({
      ...settings,
      home: { latitude: place.latitude, longitude: place.longitude, label: place.label },
    })
  }

  return (
    <>
      <PageHeader title={strings.events.title} />
      <p className="mx-4 mt-4 text-sm text-system-secondary-label">
        {strings.web.homeDetectionUnavailable}
      </p>
      <EventsScreen
        settings={settings}
        canSetHome={place !== null}
        locationHref="/location"
        onToggleDetectHome={toggleDetectHome}
        onSetHome={setHome}
        onToggleManual={(event) =>
          setEventSettings({
            ...settings,
            manual: settings.manual.includes(event)
              ? settings.manual.filter((entry) => entry !== event)
              : [...settings.manual, event],
          })
        }
      />
    </>
  )
}
