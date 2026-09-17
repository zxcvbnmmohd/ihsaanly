import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { widgetsDirectory } from 'expo-widgets';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { Surface } from '@/components/surface';
import { colors } from '@/theme/colors';
import CounterWidget from '@/widgets/counter-widget';
import DeliveryActivity, { type DeliveryProps } from '@/widgets/delivery-activity';

// Fake delivery stages the Live Activity steps through automatically. One stage
// advances every ADVANCE_MS: Preparing -> +5 min On the way -> +5 min Delivered.
const STAGES: DeliveryProps['status'][] = ['Preparing', 'On the way', 'Delivered'];
const ADVANCE_MS = 5 * 60 * 1000;
// The widget counts down to the arrival time and fills its progress bar across
// this window on its own. Derive it from ADVANCE_MS so the countdown always hits
// 0 exactly when the final stage lands.
const ETA_MS = ADVANCE_MS * (STAGES.length - 1);
const DELIVERED_LINGER_MS = 3 * 1000;

// Widgets run in a separate process, so any image the widget renders has to
// live in the shared app group container (`widgetsDirectory`).
async function ensureImageInSharedStorage(fileName: string, assetModule: number): Promise<string> {
  const file = new File(widgetsDirectory, fileName);
  if (!file.exists) {
    const asset = await Asset.fromModule(assetModule).downloadAsync();
    await new File(asset.localUri!).copy(file);
  }
  return file.uri;
}

export default function Home() {
  useColorScheme(); // re-resolve Android Material colors on theme change
  const [count, setCount] = useState(0);
  const [imageUris, setImageUris] = useState<{ logoUri: string; gridUri: string }>();
  const [deliveryRunning, setDeliveryRunning] = useState(false);
  const activityRef = useRef<ReturnType<typeof DeliveryActivity.start> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'ios') return;
    Promise.all([
      ensureImageInSharedStorage('logo.png', require('../../../assets/images/logo.png')),
      ensureImageInSharedStorage(
        'background-grid.png',
        require('../../../assets/images/background-grid.png'),
      ),
    ]).then(([logoUri, gridUri]) => {
      setImageUris({ logoUri, gridUri });
      CounterWidget.updateSnapshot({ count: 0, logoUri, gridUri });
    });
  }, []);

  const increment = () => {
    const nextCount = count + 1;
    setCount(nextCount);
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Snapshot props replace the previous ones entirely, so the image URIs must
    // be included in every update — otherwise this blanks them out.
    if (imageUris) CounterWidget.updateSnapshot({ count: nextCount, ...imageUris });
  };

  const propsForStage = (
    stage: number,
    startEpochMs: number,
    etaEpochMs: number,
  ): DeliveryProps => {
    // Clamp rather than index blindly: the interval below increments `stage`
    // before it checks whether it has reached the end, so an off-by-one here
    // would push `status: undefined` into a Live Activity that is already live.
    const index = Math.min(Math.max(stage, 0), STAGES.length - 1);
    return {
      orderId: '1234',
      status: STAGES[index]!,
      stage: index,
      startEpochMs,
      etaEpochMs,
      logoUri: imageUris?.logoUri,
    };
  };

  const startDelivery = () => {
    if (!imageUris || deliveryRunning) return; // need the shared logo first
    try {
      const startEpochMs = Date.now();
      const etaEpochMs = startEpochMs + ETA_MS;
      activityRef.current = DeliveryActivity.start(propsForStage(0, startEpochMs, etaEpochMs));
      setDeliveryRunning(true);
      let stage = 0;
      intervalRef.current = setInterval(() => {
        stage += 1;
        // Advance via update() — including the final 'Delivered' stage, since
        // end()'s content argument isn't reliably rendered on its own.
        activityRef.current?.update(propsForStage(stage, startEpochMs, etaEpochMs));
        if (stage >= STAGES.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDeliveryRunning(false);
          setTimeout(() => {
            activityRef.current?.end('default');
            activityRef.current = null;
          }, DELIVERED_LINGER_MS);
        }
      }, ADVANCE_MS);
    } catch (e) {
      // Live Activities require iOS 16.2+ and the user to have them enabled.
      console.warn('Could not start Live Activity', e);
    }
  };

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      activityRef.current?.end('immediate');
    },
    [],
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-4 p-4 pb-16">
      <Surface style={{ borderRadius: 24 }}>
        <View className="items-center gap-3 p-6">
          <Text
            selectable
            className="text-6xl font-bold"
            style={{ color: colors.label, fontVariant: ['tabular-nums'] }}>
            {count}
          </Text>
          <Text className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
            Add “Counter Widget” to your home screen, then tap to update it.
          </Text>
          <ActionButton label="Increment" icon="plus" onPress={increment} />
        </View>
      </Surface>

      <Surface style={{ borderRadius: 24 }}>
        <View className="gap-3 p-6">
          <Text className="text-lg font-semibold" style={{ color: colors.label }}>
            Live Activity
          </Text>
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            Auto-advances through delivery stages on the Lock Screen and Dynamic Island, then
            dismisses itself.
          </Text>
          <ActionButton
            label={deliveryRunning ? 'Delivery in progress…' : 'Start delivery'}
            icon="shippingbox.fill"
            disabled={deliveryRunning || !imageUris}
            onPress={startDelivery}
          />
        </View>
      </Surface>
    </ScrollView>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  useColorScheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-center gap-2 self-stretch rounded-full px-5 py-3 active:opacity-70"
      style={{
        backgroundColor: colors.tint,
        borderCurve: 'continuous',
        opacity: disabled ? 0.4 : 1,
      }}>
      {Platform.OS === 'ios' && (
        <SymbolView name={icon as never} size={18} tintColor={colors.onTint as string} />
      )}
      <Text className="text-base font-semibold" style={{ color: colors.onTint }}>
        {label}
      </Text>
    </Pressable>
  );
}
