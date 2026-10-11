import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import { StatusBar, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const RecedeContext = createContext<(receded: boolean) => void>(() => {})

/**
 * The app as a card that steps back onto black while a sheet is over it, the
 * way iOS used to draw a page sheet's presenter. iOS 26 only dims it now, and
 * Android never did either, so both get it from here.
 */
export function RecedeProvider({ children }: { children: ReactNode }): ReactElement {
  const [receded, setReceded] = useState(false)
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const scale = 0.92
  // Scaling about the centre lowers the top by this much; the card's top then
  // sits just under the status bar, above the sheet's.
  const drop = Math.max(0, insets.top - 12 - (height * (1 - scale)) / 2)

  const style = useAnimatedStyle(() => ({
    borderRadius: withTiming(receded ? 14 : 0),
    transform: [
      { translateY: withTiming(receded ? drop : 0) },
      { scale: withTiming(receded ? scale : 1) },
    ],
  }))

  return (
    <RecedeContext.Provider value={setReceded}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {receded ? <StatusBar barStyle="light-content" animated /> : null}
        <Animated.View style={[{ flex: 1, overflow: 'hidden' }, style]}>{children}</Animated.View>
      </View>
    </RecedeContext.Provider>
  )
}

/** Steps the app back for as long as the calling component is mounted. */
export function useRecede(): void {
  const setReceded = useContext(RecedeContext)
  useEffect(() => {
    setReceded(true)
    return () => setReceded(false)
  }, [setReceded])
}
