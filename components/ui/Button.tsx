import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Animated,
    Platform,
    Pressable,
    PressableProps,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
    title: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
    loading?: boolean;
}

export function Button({
    title,
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    style,
    disabled,
    ...props
}: ButtonProps) {
    const theme = useColorScheme() ?? 'light';
    const palette = Colors[theme];

    // Animation value for scale
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = (ev: any) => {
        if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
        props.onPressIn?.(ev);
    };

    const handlePressOut = (ev: any) => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 10,
        }).start();
        props.onPressOut?.(ev);
    };

    const getGradientColors = (pressed: boolean) => {
        if (disabled) return ['#4a4a4a', '#4a4a4a']; // Gray for disabled

        switch (variant) {
            case 'primary':
                // Gold Gradient: Lighter Gold -> Gold -> Darker Gold
                return pressed
                    ? ['#d4a017', '#b8860b']
                    : ['#ffd700', '#fbcd3e', '#f3b431'];
            case 'secondary':
                // Translucent Violet Gradient
                return pressed
                    ? ['rgba(212, 187, 255, 0.3)', 'rgba(212, 187, 255, 0.2)']
                    : ['rgba(212, 187, 255, 0.15)', 'rgba(212, 187, 255, 0.05)'];
            default:
                return ['transparent', 'transparent'];
        }
    };

    const getTextColor = () => {
        if (disabled) return palette.surface;
        switch (variant) {
            case 'primary': return '#3a1c00'; // Deep Brown for contrast on Gold
            case 'secondary': return '#ffffff';
            case 'outline': return palette.tint;
            case 'ghost': return palette.tint;
            default: return '#3a1c00';
        }
    };

    const paddingVertical = size === 'sm' ? 10 : size === 'md' ? 14 : 18;
    const paddingHorizontal = size === 'sm' ? 20 : size === 'md' ? 28 : 32;
    const fontSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;

    // Render content wrapped in gradient or view based on variant
    const renderContent = (pressed: boolean) => {
        const isGradient = variant === 'primary' || variant === 'secondary';

        const content = (
            <View style={styles.content}>
                {icon}
                <Text
                    style={[
                        styles.text,
                        {
                            color: getTextColor(),
                            fontSize,
                            marginLeft: icon ? 8 : 0,
                            paddingVertical,
                            paddingHorizontal,
                        },
                    ]}>
                    {loading ? 'Loading...' : title}
                </Text>
            </View>
        );

        if (isGradient) {
            return (
                <LinearGradient
                    colors={getGradientColors(pressed)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                        styles.gradientContainer,
                        variant === 'primary' && styles.primaryBorder,
                        variant === 'secondary' && styles.secondaryBorder,
                    ]}
                >
                    {content}
                </LinearGradient>
            );
        }

        return (
            <View style={[
                styles.gradientContainer,
                {
                    paddingVertical,
                    paddingHorizontal,
                    borderColor: variant === 'outline' ? palette.tint : 'transparent',
                    borderWidth: variant === 'outline' ? 2 : 0,
                }
            ]}>
                {content}
            </View>
        );
    };

    return (
        <Animated.View style={[
            { transform: [{ scale: scaleAnim }] },
            style as ViewStyle,
            styles.shadow,
        ]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={styles.pressable}
                {...props}>
                {({ pressed }) => renderContent(pressed)}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    pressable: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientContainer: {
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    primaryBorder: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.4)', // Highlight at top
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)', // Shadow at bottom
    },
    secondaryBorder: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    shadow: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    }
});
