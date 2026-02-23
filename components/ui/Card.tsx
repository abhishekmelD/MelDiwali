import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ style, variant = 'elevated', children, ...props }: CardProps) {
    const theme = useColorScheme() ?? 'light';
    const palette = Colors[theme];

    const getBorderColor = () => {
        return 'rgba(255, 255, 255, 0.08)'; // Very subtle white border
    };

    const content = (
        <View style={styles.childContainer}>
            {children}
        </View>
    );

    if (variant === 'elevated') {
        return (
            <View style={[styles.shadowContainer, style]}>
                <LinearGradient
                    // Subtle gradient: Slightly lighter violet at top-left to darker at bottom-right
                    colors={['#2a1640', '#1a0b2e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.container,
                        {
                            borderColor: getBorderColor(),
                            borderWidth: 1,
                            //   borderTopColor: 'rgba(255,255,255,0.15)', // Highlight for glass effect
                        },
                    ]}
                    {...props}
                >
                    {content}
                </LinearGradient>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                styles.flatContainer,
                {
                    backgroundColor: 'transparent',
                    borderColor: palette.border,
                    borderWidth: variant === 'outlined' ? 1 : 0,
                },
                style,
            ]}
            {...props}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    shadowContainer: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    container: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    flatContainer: {
        padding: 16,
    },
    childContainer: {
        padding: 20,
    }
});
