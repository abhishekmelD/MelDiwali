import { Colors, Fonts } from '@/constants/theme';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface ReloadOverlayProps {
    visible: boolean;
    message?: string;
}

export function ReloadOverlay({ visible, message = "Reloading" }: ReloadOverlayProps) {
    const rotation = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            rotation.value = withRepeat(
                withTiming(360, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
                -1
            );
        } else {
            rotation.value = 0;
        }
    }, [rotation, visible]);

    const animatedRingStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    if (!visible) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.overlay}
        >
            <View style={styles.blurContainer}>
                <View style={styles.content}>
                    <Animated.View style={[styles.ring, animatedRingStyle]} />
                    <Text style={styles.text}>{message}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        backgroundColor: 'rgba(31, 58, 147, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurContainer: {
        padding: 40,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        gap: 20,
    },
    ring: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(79, 143, 192, 0.1)',
        borderTopColor: Colors.light.gold,
    },
    text: {
        color: 'rgba(79, 143, 192, 0.8)',
        fontSize: 13,
        fontFamily: Fonts.medium,
        letterSpacing: 2.5,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
});
