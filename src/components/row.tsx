import { Link, type Href } from 'expo-router';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { Surface } from '@/components/surface';
import { colors } from '@/theme/colors';

type RowProps = {
  title: string;
  detail?: string | null;
  href?: Href;
  onPress?: () => void;
};

export function Row({ title, detail, href, onPress }: RowProps) {
  useColorScheme();

  const body = (
    <Surface interactive style={{ borderRadius: 16, padding: 16 }}>
      <View className="gap-1">
        <Text className="text-base font-semibold" style={{ color: colors.label }}>
          {title}
        </Text>
        {detail ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </Surface>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable>{body}</Pressable>
      </Link>
    );
  }

  return <Pressable onPress={onPress}>{body}</Pressable>;
}
