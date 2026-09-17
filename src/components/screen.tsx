import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

/**
 * One scroll container for every screen. `contentInsetAdjustmentBehavior` is
 * iOS-only, so anything Android needs to do differently belongs here rather
 * than in each screen.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName={className ?? 'gap-4 p-4'}>
      {children}
    </ScrollView>
  );
}
