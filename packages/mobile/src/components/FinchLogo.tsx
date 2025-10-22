import React from 'react';
import { Image, StyleSheet, ViewStyle } from 'react-native';

interface FinchLogoProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * FinchLogo Component
 *
 * Displays the official Finch logo with proper sizing and styling.
 * The logo is a transparent PNG with the Finch bird in orange/teal colors.
 */
export default function FinchLogo({
  size = 32,
  style,
}: FinchLogoProps) {
  return (
    <Image
      source={require('../assets/images/finch-logo.png')}
      style={[
        styles.logo,
        { width: size, height: size },
        style
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // Logo maintains aspect ratio via resizeMode="contain"
  },
});
