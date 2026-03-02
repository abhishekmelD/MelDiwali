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
        if (disabled) return ['#FFFFFF', '#FFFFFF']; // Soft neutral for disabled

        switch (variant) {
            case 'primary':
                // Bright Orange -> Golden gradient - Vibrant festive colors
                return pressed
                    ? ['#FF7A00', '#FF7A00']
                    : ['#FF7A00', '#FF7A00', '#FF7A00'];
            case 'secondary':
                // Hot Pink -> Lime Green subtle gradient
                return pressed
                    ? ['rgba(0, 0, 0, 0.6)', 'rgba(255, 122, 0, 0.5)']
                    : ['rgba(255, 122, 0, 0.35)', 'rgba(255, 122, 0, 0.25)'];
            default:
                return ['transparent', 'transparent'];
        }
    };

    const getTextColor = () => {
        if (disabled) return palette.textSecondary;
        switch (variant) {
            case 'primary': return '#FFFFFF'; // White text on bright orange for high contrast
            case 'secondary': return palette.text;
            case 'outline': return palette.peach;
            case 'ghost': return palette.peach;
            default: return palette.text;
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
        borderTopColor: 'rgba(255,255,255,0.75)', // Highlight at top
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.12)', // Soft shadow at bottom
    },
    secondaryBorder: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    shadow: {
        ...Platform.select({
            ios: {
                shadowColor: '#000000', // Deep Purple shadow for new theme
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    }
});
