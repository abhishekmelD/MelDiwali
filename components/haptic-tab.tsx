import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { hapticImpact } from '@/lib/haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // Add a soft haptic feedback when pressing down on the tabs.
        hapticImpact();
        props.onPressIn?.(ev);
      }}
    />
  );
}
