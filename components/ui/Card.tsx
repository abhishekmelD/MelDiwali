import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ style, variant = 'elevated', children, ...props }: CardProps) {
    const theme = useColorScheme() ?? 'light';
    const palette = Colors[theme];

    const getBorderColor = () => {
        return 'rgba(58, 28, 0, 0.08)'; // Very subtle warm border
    };

    if (variant === 'elevated') {
        return (
            <View style={[styles.shadowContainer, style]}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor: palette.surfaceElevated,
                            borderColor: getBorderColor(),
                            borderWidth: 1,
                        },
                    ]}
                    {...props}
                >
                    <View style={styles.childContainer}>
                        {children}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                styles.flatContainer,
                {
                    backgroundColor: variant === 'flat' ? palette.surface : 'transparent',
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
                shadowColor: '#3a1c00',
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
