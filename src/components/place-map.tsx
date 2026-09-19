import { useState, type ReactElement } from 'react'
import { Image } from 'expo-image'
import { View, type LayoutChangeEvent } from 'react-native'

import worldMap from '../../assets/images/world-equirectangular.png'

/** Exactly 2:1 over the full globe, so x = (lon + 180) / 360 and y = (90 - lat) / 180. */
const MAP_ASPECT = 1440 / 720

interface Thing {
  width: number
}

interface PlaceMapProps {
  latitude: number
  longitude: number
  accent: string
  onAccent: string
  height?: number
  /** How many times wider than the view the whole world is. 4 shows a continent. */
  zoom?: number
}

/**
 * A window onto a bundled world map, centred on the place, with a marker.
 * Offline by construction: no tile server ever learns the coordinates.
 */
export function PlaceMap({
  latitude,
  longitude,
  accent,
  onAccent,
  height = 140,
  zoom = 4,
}: PlaceMapProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ width: 0 })

  const measure = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width
    setThing((current) => (current.width === width ? current : { width }))
  }

  const imageWidth = thing.width * zoom
  const imageHeight = imageWidth / MAP_ASPECT
  const x = ((longitude + 180) / 360) * imageWidth
  const y = ((90 - latitude) / 180) * imageHeight
  // Centre the place, but never show past the map's edge.
  const left = Math.min(0, Math.max(thing.width - imageWidth, thing.width / 2 - x))
  const top = Math.min(0, Math.max(height - imageHeight, height / 2 - y))
  const markerX = left + x
  const markerY = top + y

  return (
    <View
      onLayout={measure}
      className="overflow-hidden rounded-2xl"
      style={{ height, borderCurve: 'continuous' }}>
      {thing.width > 0 ? (
        <>
          <Image
            source={worldMap}
            tintColor={accent}
            contentFit="fill"
            style={{
              position: 'absolute',
              top,
              start: left,
              width: imageWidth,
              height: imageHeight,
              opacity: 0.32,
            }}
          />
          <View
            className="absolute items-center justify-center rounded-full"
            style={{
              start: markerX - 14,
              top: markerY - 14,
              width: 28,
              height: 28,
              backgroundColor: accent,
              opacity: 0.35,
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              start: markerX - 6,
              top: markerY - 6,
              width: 12,
              height: 12,
              backgroundColor: accent,
              borderWidth: 2,
              borderColor: onAccent,
            }}
          />
        </>
      ) : null}
    </View>
  )
}
