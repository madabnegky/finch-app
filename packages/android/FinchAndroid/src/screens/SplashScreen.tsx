// packages/android/FinchAndroid/src/screens/SplashScreen.tsx

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
// Assuming you will have navigation set up
// import { useNavigation } from '@react-navigation/native'; 

// TODO: A designer should create this Lottie animation file
const finchAnimation = require('../assets/animations/finch-animation.json');

// Using your brand colors
const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
};

// This is a placeholder for your logo component
const FinchLogo = () => <View style={styles.logoPlaceholder} />; 

export const SplashScreen = () => {
  // const navigation = useNavigation(); // Hook for navigation
  const animationProgress = useRef(new Animated.Value(0)).current;

  // This function will navigate the user to the Welcome screen
  const navigateToNextScreen = () => {
    console.log('Navigating to Welcome Screen...');
    // navigation.replace('Welcome'); // Example navigation
  };

  // On first run, we'd check AsyncStorage. For now, we'll just play the animation.
  useEffect(() => {
    Animated.timing(animationProgress, {
      toValue: 1,
      duration: 3000, // Duration of our Lottie animation
      useNativeDriver: true,
    }).start(navigateToNextScreen); // Navigate when animation finishes
  }, []);

  return (
    <Pressable style={styles.container} onPress={navigateToNextScreen}>
      <LottieView
        source={finchAnimation}
        progress={animationProgress}
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
  logoPlaceholder: {
      width: 150,
      height: 50,
      backgroundColor: brandColors.primaryBlue, // Placeholder with brand color
  },
});