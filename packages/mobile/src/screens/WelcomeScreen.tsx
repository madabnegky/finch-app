// packages/android/FinchAndroid/src/screens/WelcomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Setup: undefined;
  Main: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
};

export const WelcomeScreen = () => {
  const { signInGuest, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);

  // Debug: Log when user state changes
  useEffect(() => {
    console.log('WelcomeScreen - user state:', user);
  }, [user]);

  const handleGiveItATry = async () => {
    try {
      setLoading(true);
      console.log('Starting guest sign in...');
      await signInGuest();
      console.log('Guest sign in successful!');

      // TEMPORARY FIX: Manually navigate since onAuthStateChanged isn't firing
      // TODO: Fix the auth state listener issue
      navigation.reset({
        index: 0,
        routes: [{ name: 'Setup' }],
      });
    } catch (error) {
      console.error('Guest sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert(
        'Error',
        `Failed to start guest mode: ${errorMessage}`
      );
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    console.log('Sign In pressed');
    // TODO: Navigate to sign in screen
    Alert.alert('Coming Soon', 'Sign In screen will be added next!');
  };

  const handleCreateAccount = () => {
    console.log('Create Account pressed');
    // TODO: Navigate to sign up screen
    Alert.alert('Coming Soon', 'Sign Up screen will be added next!');
  };

  return (
    <View style={styles.container}>
      {/* Logo/Branding Area */}
      <View style={styles.brandingContainer}>
        <Text style={styles.appName}>Finch</Text>
        <Text style={styles.tagline}>Your Personal Finance Companion</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Give it a Try Button */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleGiveItATry}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Loading...' : 'Give it a Try'}
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSignIn}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCreateAccount}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: brandColors.primaryBlue,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: brandColors.textGray,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: brandColors.primaryBlue,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: brandColors.primaryBlue,
  },
  secondaryButtonText: {
    color: brandColors.primaryBlue,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});