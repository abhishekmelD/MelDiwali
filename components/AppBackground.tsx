import React from 'react';
import { ImageBackground, StyleSheet, View, useWindowDimensions } from 'react-native';

export function AppBackground() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isExpanded = viewportWidth >= 1024;
  const appFrameWidth = isExpanded
    ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
    : viewportWidth;

  return (
    <View pointerEvents="none" style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/bg.jpeg')}
        style={[styles.background, { width: appFrameWidth }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  background: {
    height: '100%',
  },
});
