import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Session timeout configuration
 */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes (1 min before lock)

/**
 * Hook that automatically locks the app UI after a period of inactivity
 * IMPORTANT: This LOCKS the UI but keeps the user logged in for push notifications
 * Inactivity is defined as the app being in the background or no user interaction
 *
 * @param onWarning Optional callback when session is about to expire (1 minute warning)
 * @param onTimeout Optional callback when session expires (triggers UI lock)
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

    // Set warning timeout (1 minute before lock)
    warningTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Session expiring in 1 minute - app will lock');
      onWarning?.();
    }, WARNING_TIMEOUT_MS);

    // Set lock timeout - LOCKS UI, but keeps user logged in for notifications
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Session timeout - locking app (user stays logged in for notifications)');
      onTimeout?.();
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
        console.log('⏰ Session expired while app was in background - locking UI');
        onTimeout?.();
        // Note: User stays logged in for push notifications
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
