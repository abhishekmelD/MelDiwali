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
                    <LinearGradient
                        colors={['#FFF4D6', '#FFE4C7', '#FCD9EB', '#DFF4EA', '#E7DEFF']}
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
                    backgroundColor: variant === 'flat' ? '#FFF1D6' : 'transparent',
                    borderColor: variant === 'outlined' ? '#E8B27D' : palette.border,
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
                shadowColor: '#C66A3D',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.22,
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
        backgroundColor: 'rgba(255, 181, 156, 0.28)',
    },
    rangoliHaloBottom: {
        position: 'absolute',
        bottom: -36,
        left: -18,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(168, 230, 207, 0.24)',
    },
    childContainer: {
        padding: 20,
    }
});
