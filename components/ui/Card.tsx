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
        return 'rgba(0, 0, 0, 0.15)'; // Subtle purple border matching new theme
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
                    <LinearGradient
                        colors={['#FFFFFF', '#FF7A00', '#FFFFFF', '#FF7A00', '#FF7A00', '#FF7A00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rangoliGradient}
                    />
                    <View style={styles.rangoliHaloTop} />
                    <View style={styles.rangoliHaloBottom} />
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
                    backgroundColor: variant === 'flat' ? '#FFFFFF' : 'transparent',
                    borderColor: variant === 'outlined' ? '#FF7A00' : palette.border,
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
                shadowColor: '#000000', // Deep Purple shadow for new theme
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 18,
            },
            android: {
                elevation: 7,
            },
        }),
    },
    container: {
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    flatContainer: {
        padding: 16,
    },
    rangoliGradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.95,
    },
    rangoliHaloTop: {
        position: 'absolute',
        top: -26,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 122, 0, 0.28)', // Bright Orange halo
    },
    rangoliHaloBottom: {
        position: 'absolute',
        bottom: -36,
        left: -18,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 122, 0, 0.24)', // Lime Green halo
    },
    childContainer: {
        padding: 20,
    }
});
