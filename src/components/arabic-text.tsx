import { Text, useColorScheme, type TextProps } from 'react-native';

import { colors } from '@/theme/colors';

/** `writingDirection` + `textAlign: auto` right-aligns Arabic without hardcoding a side. */
export function ArabicText({ children, ...props }: TextProps) {
  useColorScheme();

  return (
    <Text
      {...props}
      className="text-2xl leading-loose"
      style={{ color: colors.label, writingDirection: 'rtl', textAlign: 'auto' }}>
      {children}
    </Text>
  );
}
