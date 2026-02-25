import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const NUM_STARS = 80;

interface StarData {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    layer: 1 | 2 | 3;
    twinkleType: 'slow' | 'burst' | 'steady';
    twinkleDelay: number;
    twinkleDuration: number;
    driftX: number;
    driftY: number;
    driftDuration: number;
}

function generateStars(): StarData[] {
    return Array.from({ length: NUM_STARS }, (_, i) => {
        const layer = Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1;
        const twinkleType = Math.random() > 0.7 ? 'burst' : Math.random() > 0.4 ? 'slow' : 'steady';

        return {
            id: i,
            x: Math.random() * W,
            y: Math.random() * H,
            size: layer === 3 ? Math.random() * 2 + 1.5 : layer === 2 ? Math.random() * 1.5 + 1 : Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.4 + 0.4,
            layer,
            twinkleType,
            twinkleDelay: Math.random() * 5000,
            twinkleDuration: Math.random() * 2000 + 1000,
            driftX: (Math.random() - 0.5) * (layer * 15),
            driftY: (Math.random() - 0.5) * (layer * 10),
            driftDuration: Math.random() * 10000 + 15000 / layer,
        };
    });
}

function ShootingStar() {
    const translateX = useSharedValue(-100);
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);
    const rotation = useSharedValue(45);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const trigger = () => {
            const startX = Math.random() * W;
            const startY = Math.random() * (H / 2);
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 200;
            const deltaX = Math.cos(angle) * distance;
            const deltaY = Math.sin(angle) * distance;
            translateX.value = startX;
            translateY.value = startY;
            opacity.value = 0;
            rotation.value = (angle * 180) / Math.PI;

            const duration = 1000 + Math.random() * 1000;
            const delay = 5000 + Math.random() * 15000;

            opacity.value = withDelay(delay, withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(0, { duration: duration - 100 })
            ));

            translateX.value = withDelay(delay, withTiming(startX + deltaX, { duration, easing: Easing.linear }));
            translateY.value = withDelay(delay, withTiming(startY + deltaY, { duration, easing: Easing.linear }));

            timeoutId = setTimeout(trigger, delay + duration + 1000);
        };

        trigger();
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [opacity, rotation, translateX, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` }
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.shootingStar, animatedStyle]}>
            <LinearGradient
                colors={['#FFD700', '#FF6B35', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
}

function Star({ star }: { star: StarData }) {
    const twinkle = useSharedValue(star.opacity);
    const driftX = useSharedValue(0);
    const driftY = useSharedValue(0);

    useEffect(() => {
        if (star.twinkleType === 'burst') {
            twinkle.value = withDelay(star.twinkleDelay, withRepeat(
                withSequence(
                    withTiming(1, { duration: 100 }),
                    withTiming(0.1, { duration: 300 }),
                    withTiming(star.opacity, { duration: 1000 })
                ),
                -1, true
            ));
        } else if (star.twinkleType === 'slow') {
            twinkle.value = withRepeat(
                withTiming(0.2, { duration: star.twinkleDuration * 2, easing: Easing.inOut(Easing.sin) }),
                -1, true
            );
        }

        driftX.value = withRepeat(
            withTiming(star.driftX, { duration: star.driftDuration, easing: Easing.inOut(Easing.quad) }),
            -1, true
        );
        driftY.value = withRepeat(
            withTiming(star.driftY, { duration: star.driftDuration * 1.1, easing: Easing.inOut(Easing.quad) }),
            -1, true
        );
    }, [
        driftX,
        driftY,
        star.driftDuration,
        star.driftX,
        star.driftY,
        star.opacity,
        star.twinkleDelay,
        star.twinkleDuration,
        star.twinkleType,
        twinkle,
    ]);

    const style = useAnimatedStyle(() => ({
        opacity: twinkle.value,
        transform: [
            { translateX: driftX.value },
            { translateY: driftY.value },
        ],
    }));

    const color = star.layer === 3 ? '#FFD700' : star.layer === 2 ? '#FF6B35' : '#FFFACD';

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: star.x,
                    top: star.y,
                    width: star.size,
                    height: star.size,
                    borderRadius: star.size / 2,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOpacity: star.layer === 3 ? 0.8 : 0.4,
                    shadowRadius: star.layer === 3 ? 4 : 2,
                },
                style,
            ]}
        />
    );
}

export function StarryBackground() {
    const stars = useMemo(() => generateStars(), []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[StyleSheet.absoluteFill, styles.base]} />
            {stars.map((star) => (
                <Star key={star.id} star={star} />
            ))}
            <ShootingStar />
            <ShootingStar />
        </View>
    );
}

const styles = StyleSheet.create({
    shootingStar: {
        position: 'absolute',
        width: 100,
        height: 2,
        borderRadius: 1,
    },
    base: {
        backgroundColor: '#5D3A6F', // Deep Purple background for festive theme
    },
});
