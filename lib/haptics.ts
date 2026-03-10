import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

const safeCall = (fn: () => Promise<void>) => {
    if (!isIOS) return;
    fn().catch(() => undefined);
};

export const hapticImpact = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    safeCall(() => Haptics.impactAsync(style));
};

export const hapticImpactMedium = () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
};

export const hapticSelection = () => {
    safeCall(() => Haptics.selectionAsync());
};

export const hapticSuccess = () => {
    safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
};
