import { Host, Icon, List, ListItem, Switch } from '@expo/ui';
import { useState } from 'react';
import { ScrollView } from 'react-native';

/**
 * Native controls: real SwiftUI on iOS, real Jetpack Compose (Material 3) on
 * Android. `Host` is the bridge — everything inside it is native, so React
 * Native styles and Tailwind classes don't apply in there.
 */
export default function Settings() {
  const [haptics, setHaptics] = useState(true);
  const [reminders, setReminders] = useState(false);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Host matchContents>
        <List>
          <ListItem
            leading={
              <Icon
                name={Icon.select({
                  ios: 'hand.tap.fill',
                  android: import('@expo/material-symbols/touch_app.xml'),
                })}
                size={24}
              />
            }
            trailing={<Switch value={haptics} onValueChange={setHaptics} />}>
            Haptics
          </ListItem>
          <ListItem
            leading={
              <Icon
                name={Icon.select({
                  ios: 'bell.fill',
                  android: import('@expo/material-symbols/notifications.xml'),
                })}
                size={24}
              />
            }
            trailing={<Switch value={reminders} onValueChange={setReminders} />}>
            Reminders
          </ListItem>
        </List>
      </Host>
    </ScrollView>
  );
}
