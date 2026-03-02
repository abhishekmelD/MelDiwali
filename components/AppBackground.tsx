import React from 'react';
import { StyleSheet, View } from 'react-native';

export function AppBackground() {
  return (
    <View pointerEvents="none" style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
});
