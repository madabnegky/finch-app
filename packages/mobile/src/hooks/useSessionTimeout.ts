import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import auth from '@react-native-firebase/auth';

/**
 * Session timeout configuration
 */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes (1 min before logout)

/**
 * Hook that automatically logs out the user after a period of inactivity
 * Inactivity is defined as the app being in the background or no user interaction
 *
 * @param onWarning Optional callback when session is about to expire (1 minute warning)
 * @param onTimeout Optional callback when session expires (before logout)
 */
export function useSessionTimeout(
  onWarning?: () => void,
  onTimeout?: () => void
) {
  const lastActivityTimeRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Reset the activity timer
  const resetTimer = () => {
    lastActivityTimeRef.current = Date.now();

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (1 minute before logout)
    warningTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Session expiring in 1 minute');
      onWarning?.();
    }, WARNING_TIMEOUT_MS);

    // Set logout timeout
    timeoutRef.current = setTimeout(async () => {
      console.log('⏰ Session timeout - logging out user');
      onTimeout?.();

      try {
        await auth().signOut();
        console.log('✅ User logged out due to inactivity');
      } catch (error) {
        console.error('❌ Error logging out on timeout:', error);
      }
    }, SESSION_TIMEOUT_MS);
  };

  // Handle app state changes (background/foreground)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousAppState = appStateRef.current;
    appStateRef.current = nextAppState;

    if (
      previousAppState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App came to foreground - check if session expired
      const timeInBackground = Date.now() - lastActivityTimeRef.current;

      if (timeInBackground >= SESSION_TIMEOUT_MS) {
        console.log('⏰ Session expired while app was in background');
        onTimeout?.();

        // Sign out immediately
        auth().signOut().catch((error) => {
          console.error('❌ Error logging out on background timeout:', error);
        });
      } else {
        // Reset timer since app is active again
        console.log('✅ App resumed - session still valid');
        resetTimer();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background - keep timer running
      console.log('📱 App went to background - session timer continues');
    }
  };

  useEffect(() => {
    // Only run if user is authenticated
    const user = auth().currentUser;
    if (!user) {
      return;
    }

    console.log('🔒 Session timeout initialized (15 min)');

    // Start the timer
    resetTimer();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      subscription.remove();
    };
  }, []);

  // Return reset function so components can manually reset the timer on user interaction
  return { resetTimer };
}
