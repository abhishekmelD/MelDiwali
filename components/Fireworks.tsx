import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const PARTICLES_PER_FIREWORK = 12;

const FIREWORK_COLORS = ['#2A9D8F', '#4F8FC0', '#1F3A93', '#2A9D8F', '#F3E9D2', '#4F8FC0', '#4F8FC0', '#4F8FC0'];

const Particle = ({ angle, radius, color, delay }: { angle: number; radius: number; color: string; delay: number }) => {
    const opacity = useSharedValue(0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(0);

    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 1000 })
        ));
        scale.value = withDelay(delay, withTiming(1, { duration: 500 }));
        translateX.value = withDelay(delay, withTiming(Math.cos(angle) * radius, {
            duration: 1200,
            easing: Easing.out(Easing.quad)
        }));
        translateY.value = withDelay(delay, withTiming(Math.sin(angle) * radius + 40, {
            duration: 1200,
            easing: Easing.out(Easing.quad)
        }));
    }, [angle, delay, opacity, radius, scale, translateX, translateY]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />;
};

const FireworkBurst = ({ onDone }: { onDone: () => void }) => {
    const x = Math.random() * (width - 100) + 50;
    const y = Math.random() * (height / 2) + 100;
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

    useEffect(() => {
        const timer = setTimeout(onDone, 3000);
        return () => clearTimeout(timer);
    }, [onDone]);

    return (
        <View style={[styles.fireworkContainer, { left: x, top: y }]}>
            {Array.from({ length: PARTICLES_PER_FIREWORK }).map((_, i) => (
                <Particle
                    key={i}
                    angle={(i * (360 / PARTICLES_PER_FIREWORK) * Math.PI) / 180}
                    radius={Math.random() * 60 + 30}
                    color={color}
                    delay={Math.random() * 200}
                />
            ))}
        </View>
    );
};

export function Fireworks() {
    const [bursts, setBursts] = useState<{ id: number }[]>([]);

    useEffect(() => {
        const trigger = () => {
            if (bursts.length < 3) {
                setBursts(prev => [...prev, { id: Date.now() }]);
            }
            const nextDelay = 3000 + Math.random() * 7000;
            setTimeout(trigger, nextDelay);
        };
        const initialDelay = setTimeout(trigger, 2000);
        return () => clearTimeout(initialDelay);
    }, [bursts]);

    const removeBurst = (id: number) => {
        setBursts(prev => prev.filter(b => b.id !== id));
    };

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {bursts.map(b => (
                <FireworkBurst key={b.id} onDone={() => removeBurst(b.id)} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    fireworkContainer: {
        position: 'absolute',
        width: 0,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    particle: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
    },
});
