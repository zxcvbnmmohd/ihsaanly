import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Surface } from '@/components/surface';
import { items, resolveText } from '@/content';
import { strings } from '@/strings';
import { colors } from '@/theme/colors';

export default function Library() {
  useColorScheme();

  if (items.length === 0) {
    return <EmptyState message={strings.library.empty} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      {items.map((item) => (
        <Link key={item.id} href={`/item/${item.id}`} asChild>
          <Pressable>
            <Surface interactive style={{ borderRadius: 16, padding: 16 }}>
              <View className="gap-1">
                <Text className="text-base font-semibold" style={{ color: colors.label }}>
                  {resolveText(item.title)}
                </Text>
                <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
                  {strings.ruling[item.ruling]}
                </Text>
              </View>
            </Surface>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}
