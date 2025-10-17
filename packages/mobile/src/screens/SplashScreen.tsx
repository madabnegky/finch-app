// packages/android/FinchAndroid/src/screens/SplashScreen.tsx

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// TODO: A designer should create this Lottie animation file
const finchAnimation = require('../assets/animations/finch-animation.json');

// Using your brand colors
const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
}; 

type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const animationRef = useRef<LottieView>(null);

  // This function will navigate the user to the Welcome screen
  const navigateToNextScreen = () => {
    console.log('UPDATED CODE VERSION 2.0 - Navigating to Welcome Screen...');
    navigation.replace('Welcome');
  };

  // On first run, we'd check AsyncStorage. For now, we'll just play the animation.
  useEffect(() => {
    // Navigate after 3 seconds (animation duration)
    const timer = setTimeout(navigateToNextScreen, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Pressable style={styles.container} onPress={navigateToNextScreen}>
      <LottieView
        ref={animationRef}
        source={finchAnimation}
        autoPlay
        loop={false}
        style={styles.lottieAnimation}
      />
      {/* We can add the logo fade-in here as well if desired */}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 300,
    height: 300,
  },
});