import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { getUserPreferences } from '../services/userPreferencesService';
import { authenticateWithBiometric, getBiometricTypeName, BiometricType, isBiometricAvailable } from '../services/biometricService';
import { brandColors } from '../theme/colors';

interface BiometricAuthWrapperProps {
  children: React.ReactNode;
}

/**
 * Biometric Authentication Wrapper
 * Prompts for biometric authentication when:
 * - App first loads (if biometric auth is enabled)
 * - App returns from background (if biometric auth is enabled)
 */
export function BiometricAuthWrapper({ children }: BiometricAuthWrapperProps) {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [authenticationFailed, setAuthenticationFailed] = useState(false);

  // Check if biometric auth should be prompted
  const checkAndPromptBiometric = async () => {
    if (!user) {
      setIsLocked(false);
      return;
    }

    try {
      // Get user preferences
      const preferences = await getUserPreferences();

      // Only prompt if biometric auth is enabled
      if (!preferences.biometricAuthEnabled) {
        setIsLocked(false);
        return;
      }

      // Check if biometrics are available
      const { available, biometryType } = await isBiometricAvailable();
      if (!available) {
        console.log('Biometrics not available, skipping auth');
        setIsLocked(false);
        return;
      }

      setBiometricType(biometryType);
      setIsLocked(true);

      // Prompt for biometric authentication
      const result = await authenticateWithBiometric();

      if (result.success) {
        setIsLocked(false);
        setAuthenticationFailed(false);
      } else {
        setAuthenticationFailed(true);
        // Keep locked, user can try again
      }
    } catch (error) {
      console.error('Error checking biometric auth:', error);
      // Fail open - don't lock user out if there's an error
      setIsLocked(false);
    }
  };

  // Prompt on initial load
  useEffect(() => {
    if (user) {
      checkAndPromptBiometric();
    }
  }, [user]);

  // Prompt when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if we should prompt
        checkAndPromptBiometric();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background, prepare to lock
        getUserPreferences().then(preferences => {
          if (preferences.biometricAuthEnabled) {
            setIsLocked(true);
          }
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [user]);

  // If not locked, render children normally
  if (!isLocked) {
    return <>{children}</>;
  }

  // Render lock screen
  return (
    <View style={styles.lockScreen}>
      <View style={styles.lockContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={biometricType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
            size={80}
            color={brandColors.tealPrimary}
          />
        </View>

        <Text style={styles.title}>Finch is Locked</Text>
        <Text style={styles.subtitle}>
          {authenticationFailed
            ? 'Authentication failed. Try again.'
            : `Use ${getBiometricTypeName(biometricType)} to unlock`}
        </Text>

        <TouchableOpacity
          style={styles.unlockButton}
          onPress={checkAndPromptBiometric}
        >
          <Icon name="lock-open-variant" size={20} color={brandColors.white} />
          <Text style={styles.unlockButtonText}>
            Unlock with {getBiometricTypeName(biometricType)}
          </Text>
        </TouchableOpacity>

        {authenticationFailed && (
          <Text style={styles.errorText}>
            Tap the button above to try again
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: brandColors.tealLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: brandColors.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brandColors.tealPrimary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
  errorText: {
    fontSize: 14,
    color: brandColors.orangeAccent,
    marginTop: 16,
    textAlign: 'center',
  },
});
