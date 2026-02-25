import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

export function AppBackground() {
  return (
    <ImageBackground
      source={require('@/assets/images/bg.jpeg')}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}
