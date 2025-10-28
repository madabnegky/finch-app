import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { Platform } from 'react-native';

const rnBiometrics = new ReactNativeBiometrics();

export type BiometricType = 'FaceID' | 'TouchID' | 'Biometrics' | null;

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  biometryType: BiometricType;
  error?: string;
}> {
  try {
    const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();

    if (!available) {
      return {
        available: false,
        biometryType: null,
        error: error || 'Biometric authentication not available',
      };
    }

    let type: BiometricType = null;
    if (biometryType === BiometryTypes.FaceID) {
      type = 'FaceID';
    } else if (biometryType === BiometryTypes.TouchID) {
      type = 'TouchID';
    } else if (biometryType === BiometryTypes.Biometrics) {
      type = 'Biometrics';
    }

    return {
      available: true,
      biometryType: type,
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return {
      available: false,
      biometryType: null,
      error: 'Failed to check biometric availability',
    };
  }
}

/**
 * Prompt user for biometric authentication
 */
export async function authenticateWithBiometric(
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { available, biometryType } = await isBiometricAvailable();

    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication not available on this device',
      };
    }

    // Determine prompt message based on biometric type
    let promptMessage = reason || 'Authenticate to access Finch';
    if (biometryType === 'FaceID') {
      promptMessage = reason || 'Use Face ID to unlock Finch';
    } else if (biometryType === 'TouchID') {
      promptMessage = reason || 'Use Touch ID to unlock Finch';
    } else if (biometryType === 'Biometrics') {
      promptMessage = reason || 'Authenticate to unlock Finch';
    }

    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (success) {
      console.log('✅ Biometric authentication successful');
      return { success: true };
    } else {
      console.log('❌ Biometric authentication failed');
      return {
        success: false,
        error: 'Authentication failed or cancelled',
      };
    }
  } catch (error: any) {
    console.error('❌ Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Biometric authentication error',
    };
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(type: BiometricType): string {
  switch (type) {
    case 'FaceID':
      return 'Face ID';
    case 'TouchID':
      return 'Touch ID';
    case 'Biometrics':
      return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
    default:
      return 'Biometric Authentication';
  }
}

/**
 * Check if device has biometrics enrolled
 * (i.e., user has set up Face ID, Touch ID, or fingerprint)
 */
export async function hasBiometricsEnrolled(): Promise<boolean> {
  try {
    const { available } = await isBiometricAvailable();
    return available;
  } catch (error) {
    console.error('Error checking biometric enrollment:', error);
    return false;
  }
}
