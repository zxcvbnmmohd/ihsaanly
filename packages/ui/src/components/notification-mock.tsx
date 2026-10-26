import { palettes } from '@ihsaanly/tailwind/tokens'
import { Image } from 'expo-image'
import type { ReactElement } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import { Surface } from './surface'
import { APP_NAME, AppIcon } from './widget-scene'

/** The solid star Android draws as the notification's small icon (`notification-icon.png`). */
const STAR = require('../../assets/images/star-solid.png')

/** What the real notification would say: never a clock time, only "now". */
export interface NotificationMockProps {
  title: string
  body: string
  /** Its buttons, as the system draws them once the notification is expanded. */
  actions: readonly string[]
  /** Which system's notification to draw. Defaults to the platform it runs on. */
  platform?: 'ios' | 'android'
}

/** The icon's side on an iOS notification; `AppIcon` rounds it as iOS does. */
const IOS_ICON = 38

/**
 * The colour the Android build tints its notifications with (`expo-notifications`'
 * `color` in app.json): the default accent, whatever accent the app wears.
 */
const ANDROID_TINT = palettes.light.accent
const ANDROID_ON_TINT = palettes.light.onAccent

/**
 * iOS, held down: the notification on the system material (liquid glass or a
 * blur, from Surface), the app's icon at its leading edge, the title in
 * semibold beside "now", the body under it; then its actions as the separate
 * menu iOS shows under an expanded notification.
 */
function IosNotification({ title, body, actions }: NotificationMockProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  return (
    <View className="gap-2">
      <Surface style={{ borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14 }}>
        <View className="flex-row items-start gap-3">
          <AppIcon size={IOS_ICON} />
          <View className="flex-1">
            <View className="flex-row items-baseline gap-2">
              <Text
                numberOfLines={1}
                className="flex-1 font-semibold text-sm"
                style={{ color: colors.label }}>
                {title}
              </Text>
              <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
                {strings.onboarding.previewNow}
              </Text>
            </View>
            <Text
              numberOfLines={4}
              className="text-sm leading-snug"
              style={{ color: colors.label }}>
              {body}
            </Text>
          </View>
        </View>
      </Surface>
      <View className="flex-row">
        <Surface style={{ borderRadius: 14, minWidth: 200, maxWidth: '75%' }}>
          {actions.map((action, index) => (
            <View
              key={action}
              className="px-4 py-2.5"
              style={{
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: colors.separator,
              }}>
              <Text numberOfLines={1} className="text-base" style={{ color: colors.label }}>
                {action}
              </Text>
            </View>
          ))}
        </Surface>
      </View>
    </View>
  )
}

/**
 * Android, expanded: one card in the shade, the small icon in its tint circle
 * beside "Ihsaanly · now", the title over the body, and the actions as text
 * buttons in the tint along the bottom.
 */
function AndroidNotification({ title, body, actions }: NotificationMockProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  return (
    <Surface style={{ borderRadius: 24, paddingTop: 14, paddingBottom: 6, paddingHorizontal: 16 }}>
      <View className="flex-row items-start gap-3">
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: ANDROID_TINT }}>
          <Image
            source={STAR}
            tintColor={ANDROID_ON_TINT}
            contentFit="contain"
            accessible={false}
            aria-hidden
            style={{ width: 18, height: 18 }}
          />
        </View>
        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-xs" style={{ color: colors.secondaryLabel }}>
            {`${APP_NAME} · ${strings.onboarding.previewNow}`}
          </Text>
          <Text numberOfLines={1} className="font-medium text-base" style={{ color: colors.label }}>
            {title}
          </Text>
          <Text
            numberOfLines={4}
            className="text-sm leading-snug"
            style={{ color: colors.secondaryLabel }}>
            {body}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-x-2 ps-12">
        {actions.map((action) => (
          <View key={action} className="justify-center px-2" style={{ minHeight: 40 }}>
            <Text numberOfLines={1} className="font-medium text-sm" style={{ color: ANDROID_TINT }}>
              {action}
            </Text>
          </View>
        ))}
      </View>
    </Surface>
  )
}

/**
 * A notification as the system would draw it, expanded so its buttons show,
 * so someone can see that a reminder can be ticked off from there. It is a
 * picture: nothing on it can be pressed.
 *
 * iOS shows no app name on a notification that has a title, so only the
 * Android one carries "Ihsaanly"; on iOS the icon says whose it is.
 */
export function NotificationMock({
  title,
  body,
  actions,
  platform = process.env.EXPO_OS === 'android' ? 'android' : 'ios',
}: NotificationMockProps): ReactElement {
  return (
    <View testID="notification-preview">
      {platform === 'android' ? (
        <AndroidNotification title={title} body={body} actions={actions} />
      ) : (
        <IosNotification title={title} body={body} actions={actions} />
      )}
    </View>
  )
}
