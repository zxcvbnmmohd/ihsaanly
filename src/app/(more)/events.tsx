import type { ReactElement } from 'react'

import { startHomeMonitoring, stopHomeMonitoring } from '@/events/geofence'
import { setEventSettings, useEventSettings } from '@/events/store'
import { usePlace } from '@/location/store'
import { EventsScreen } from '@/screens/events'

export default function EventsRoute(): ReactElement {
  const settings = useEventSettings()
  const place = usePlace()

  const toggleDetectHome = (): void => {
    const detectHome = !settings.detectHome
    setEventSettings({ ...settings, detectHome })

    if (!detectHome) {
      void stopHomeMonitoring()
      return
    }

    if (settings.home) void startHomeMonitoring(settings.home)
  }

  const setHome = (): void => {
    if (!place) return
    const home = { latitude: place.latitude, longitude: place.longitude, label: place.label }
    setEventSettings({ ...settings, home })
    if (settings.detectHome) void startHomeMonitoring(home)
  }

  return (
    <EventsScreen
      settings={settings}
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
  )
}
