// packages/mobile/src/services/notificationService.ts
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * Request notification permissions from the user
 * iOS: Uses Firebase Messaging authorization
 * Android: Uses PermissionsAndroid
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS notification permission granted:', authStatus);
      } else {
        console.log('❌ iOS notification permission denied');
      }

      return enabled;
    } else {
      // Android 13+ requires POST_NOTIFICATIONS permission
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
      if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Android notification permission granted');
          return true;
        } else {
          console.log('❌ Android notification permission denied');
          return false;
        }
      } else {
        // Android < 13 doesn't require runtime permission
        console.log('✅ Android < 13, notifications enabled by default');
        return true;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get the FCM token and save it to Firestore
 * @param userId - Firebase user ID
 */
export async function registerDeviceForNotifications(userId: string): Promise<void> {
  try {
    // Request permission first
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      console.log('⚠️ Notification permission not granted, skipping token registration');
      return;
    }

    // Register for remote messages first (required for iOS)
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    // Get FCM token
    const token = await messaging().getToken();
    if (__DEV__) {
      console.log('✅ FCM token saved to Firestore:', token);
    }

    if (!token) {
      console.warn('⚠️ No FCM token received');
      return;
    }

    // Save token to Firestore
    const userRef = firestore().collection('users').doc(userId);

    await userRef.set(
      {
        fcmTokens: firestore.FieldValue.arrayUnion(token),
        lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('✅ FCM token saved to Firestore for user:', userId);
  } catch (error) {
    console.error('❌ Error registering device for notifications:', error);
  }
}

/**
 * Remove the current device's FCM token from Firestore
 * @param userId - Firebase user ID
 */
export async function unregisterDeviceForNotifications(userId: string): Promise<void> {
  try {
    const token = await messaging().getToken();

    if (!token) {
      console.warn('⚠️ No FCM token to unregister');
      return;
    }

    const userRef = firestore().collection('users').doc(userId);

    await userRef.update({
      fcmTokens: firestore.FieldValue.arrayRemove(token),
    });

    console.log('✅ FCM token removed from Firestore for user:', userId);
  } catch (error) {
    console.error('❌ Error unregistering device for notifications:', error);
  }
}

/**
 * Handle foreground notifications (when app is open)
 */
export function setupForegroundNotificationHandler(): () => void {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 Foreground notification received:', remoteMessage);

    // Show an alert when notification arrives while app is open
    if (remoteMessage.notification) {
      Alert.alert(
        remoteMessage.notification.title || 'Notification',
        remoteMessage.notification.body || '',
        [{ text: 'OK' }]
      );
    }
  });

  return unsubscribe;
}

/**
 * Handle background/quit state notifications
 */
export function setupBackgroundNotificationHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('📬 Background notification received:', remoteMessage);
    // Background notifications are automatically shown by the OS
    // You can add custom logic here if needed
  });
}

/**
 * Handle notification taps (when user taps notification to open app)
 */
export function setupNotificationOpenHandler(
  callback: (notification: any) => void
): () => void {
  // Handle notification that opened the app from quit state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📬 App opened from quit state by notification:', remoteMessage);
        callback(remoteMessage);
      }
    });

  // Handle notification that opened the app from background state
  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('📬 App opened from background by notification:', remoteMessage);
    callback(remoteMessage);
  });

  return unsubscribe;
}

/**
 * Handle FCM token refresh
 */
export function setupTokenRefreshHandler(userId: string): () => void {
  const unsubscribe = messaging().onTokenRefresh(async (token) => {
    console.log('🔄 FCM token refreshed:', token);

    try {
      const userRef = firestore().collection('users').doc(userId);

      await userRef.set(
        {
          fcmTokens: firestore.FieldValue.arrayUnion(token),
          lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log('✅ Refreshed FCM token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving refreshed token:', error);
    }
  });

  return unsubscribe;
}
