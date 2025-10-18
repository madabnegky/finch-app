import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  red: '#EF4444',
};

type ScreenType = 'signIn' | 'signUp';

export const AuthScreen = () => {
  const [screen, setScreen] = useState<ScreenType>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInGuest, signInWithGoogle } = useAuth();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // For sign up, validate password confirmation
    if (screen === 'signUp') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      if (screen === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      // Navigation will happen automatically via AuthProvider
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInGuest();
      // Navigation will happen automatically via AuthProvider
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      // Navigation will happen automatically via AuthProvider
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo/Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐦 Finch</Text>
          <Text style={styles.title}>
            {screen === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={brandColors.textGray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={brandColors.textGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={screen === 'signIn' ? 'password' : 'newPassword'}
              editable={!loading}
            />
          </View>

          {/* Confirm Password (only for sign up) */}
          {screen === 'signUp' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={brandColors.textGray}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="newPassword"
                editable={!loading}
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? 'Loading...'
                : screen === 'signIn'
                ? 'Sign in'
                : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In and Guest Buttons */}
          <View style={styles.alternativeButtonsContainer}>
            <TouchableOpacity
              style={[styles.alternativeButton, loading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Icon name="google" size={20} color={brandColors.textDark} style={{ marginRight: 8 }} />
              <Text style={styles.alternativeButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.alternativeButton, loading && styles.buttonDisabled]}
              onPress={handleGuestSignIn}
              disabled={loading}
            >
              <Text style={styles.alternativeButtonText}>👤 Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle between Sign In and Sign Up */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setScreen(screen === 'signIn' ? 'signUp' : 'signIn');
              setError('');
            }}
            disabled={loading}
          >
            <Text style={styles.toggleButtonText}>
              {screen === 'signIn'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.textDark,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    backgroundColor: brandColors.white,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: brandColors.red,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: brandColors.primaryBlue,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  alternativeButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  alternativeButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternativeButtonText: {
    color: brandColors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brandColors.lightGray,
  },
  dividerText: {
    marginHorizontal: 16,
    color: brandColors.textGray,
    fontSize: 14,
  },
  toggleButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: brandColors.primaryBlue,
    fontSize: 14,
    fontWeight: '600',
  },
});
