import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, useColorScheme, View } from 'react-native';

import { ArabicText } from '@/components/arabic-text';
import { EmptyState } from '@/components/empty-state';
import { EvidencePanel } from '@/components/evidence-panel';
import { itemById, resolveText } from '@/content';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export default function ItemDetail() {
  useColorScheme();

  const { id } = useLocalSearchParams<{ id: string }>();
  const item = itemById(id);

  if (!item) {
    return <EmptyState message={strings.notFound.body} />;
  }

  const title = resolveText(item.title);
  const transliteration = resolveText(item.transliteration);
  const translation = resolveText(item.translation);
  const note = resolveText(item.note);

  return (
    <>
      <Stack.Screen options={{ title: title ?? strings.library.title }} />
      <ScrollView contentContainerClassName="gap-6 p-4" contentInsetAdjustmentBehavior="automatic">
        <View className="gap-2">
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.ruling[item.ruling]}
          </Text>
          {item.repeat > 1 ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {strings.item.repeat(item.repeat)}
            </Text>
          ) : null}
        </View>

        {item.arabic ? <ArabicText>{item.arabic}</ArabicText> : null}

        {transliteration ? (
          <View className="gap-1">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.secondaryLabel }}>
              {strings.item.transliteration}
            </Text>
            <Text className="text-base italic" style={{ color: colors.label }}>
              {transliteration}
            </Text>
          </View>
        ) : null}

        {translation ? (
          <View className="gap-1">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.secondaryLabel }}>
              {strings.item.translation}
            </Text>
            <Text className="text-base" style={{ color: colors.label }}>
              {translation}
            </Text>
          </View>
        ) : null}

        {note ? (
          <View className="gap-1">
            <Text
              className="text-xs font-semibold uppercase"
              style={{ color: colors.secondaryLabel }}>
              {strings.item.note}
            </Text>
            <Text className="text-sm" style={{ color: colors.label }}>
              {note}
            </Text>
          </View>
        ) : null}

        <EvidencePanel evidence={item.evidence} />
      </ScrollView>
    </>
  );
}
