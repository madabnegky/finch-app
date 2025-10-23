import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

/**
 * User Preferences Service
 * Manages user settings and preferences stored in Firestore
 */

export interface UserPreferences {
  notificationsEnabled: boolean;
  biometricAuthEnabled: boolean;
  hasCompletedOnboarding: boolean;
  // Add more preferences as needed
  updatedAt: Date;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  biometricAuthEnabled: false,
  hasCompletedOnboarding: false,
  updatedAt: new Date(),
};

/**
 * Get user preferences from Firestore
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }

  try {
    const doc = await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('preferences')
      .doc('settings')
      .get();

    if (doc.exists) {
      const data = doc.data();
      return {
        ...DEFAULT_PREFERENCES,
        ...data,
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      };
    }

    // Return defaults if no preferences exist yet
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user preferences in Firestore
 */
export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }

  try {
    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('preferences')
      .doc('settings')
      .set(
        {
          ...preferences,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log('✅ User preferences updated successfully');
  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
    throw error;
  }
}

/**
 * Subscribe to user preferences changes
 */
export function subscribeToUserPreferences(
  callback: (preferences: UserPreferences) => void
): () => void {
  const user = auth().currentUser;
  if (!user) {
    console.warn('No authenticated user for preferences subscription');
    return () => {};
  }

  const unsubscribe = firestore()
    .collection('users')
    .doc(user.uid)
    .collection('preferences')
    .doc('settings')
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          const data = doc.data();
          callback({
            ...DEFAULT_PREFERENCES,
            ...data,
            updatedAt: data?.updatedAt?.toDate() || new Date(),
          });
        } else {
          callback(DEFAULT_PREFERENCES);
        }
      },
      (error) => {
        console.error('Error in preferences subscription:', error);
        callback(DEFAULT_PREFERENCES);
      }
    );

  return unsubscribe;
}
