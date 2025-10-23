/**
 * User-Friendly Error Messages
 * Converts technical error codes into human-readable messages
 */

export const getFriendlyErrorMessage = (error: any): string => {
  // Extract error code from different error formats
  const code = error?.code || error?.message || String(error);

  // Firebase Auth errors
  const authErrors: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use':
      'This email is already registered. Try signing in instead.',
    'auth/weak-password':
      'Password is too weak. Please use at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/too-many-requests':
      'Too many failed attempts. Please try again later.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/network-request-failed':
      'Network error. Please check your connection and try again.',
    'auth/requires-recent-login':
      'For security, please sign in again to continue.',
    'auth/invalid-credential':
      'Invalid credentials. Please check your email and password.',
    'auth/account-exists-with-different-credential':
      'An account already exists with this email using a different sign-in method.',
    'auth/credential-already-in-use':
      'This credential is already associated with a different account.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  };

  // Firestore errors
  const firestoreErrors: Record<string, string> = {
    'firestore/permission-denied':
      "You don't have permission to perform this action.",
    'firestore/unavailable':
      'Service temporarily unavailable. Please try again.',
    'firestore/not-found': 'The requested data could not be found.',
    'firestore/already-exists': 'This record already exists.',
    'firestore/failed-precondition':
      'Operation failed. Please refresh and try again.',
    'firestore/aborted': 'Operation was cancelled. Please try again.',
    'firestore/out-of-range': 'Invalid data range provided.',
    'firestore/deadline-exceeded': 'Request timed out. Please try again.',
    'firestore/data-loss': 'Data error occurred. Please contact support.',
  };

  // Network errors
  const networkErrors: Record<string, string> = {
    'Network request failed':
      'Unable to connect. Please check your internet connection.',
    'Network error': 'Network error. Please check your connection.',
    ETIMEDOUT: 'Connection timed out. Please try again.',
    ECONNREFUSED: 'Unable to connect to server. Please try again later.',
    ENOTFOUND: 'Server not found. Please check your connection.',
  };

  // Plaid errors
  const plaidErrors: Record<string, string> = {
    'ITEM_LOGIN_REQUIRED':
      'Please sign in to your bank again to reconnect your account.',
    INVALID_CREDENTIALS:
      'Invalid bank credentials. Please check and try again.',
    ITEM_NOT_FOUND: 'Bank connection not found. Please reconnect.',
    ACCESS_NOT_GRANTED: 'Access to your bank account was not granted.',
    INSTITUTION_DOWN: 'Your bank is temporarily unavailable. Try again later.',
    INSTITUTION_NOT_RESPONDING:
      'Your bank is not responding. Please try again later.',
    INVALID_UPDATED_USERNAME:
      'Invalid username. Please check your credentials.',
    ITEM_LOCKED: 'Your bank account is locked. Please contact your bank.',
    USER_SETUP_REQUIRED:
      'Additional setup required at your bank. Please sign in to your bank.',
    MFA_NOT_SUPPORTED:
      'Multi-factor authentication not supported for this bank.',
    INSUFFICIENT_CREDENTIALS: 'Please provide all required credentials.',
  };

  // Check all error dictionaries
  const allErrors = {
    ...authErrors,
    ...firestoreErrors,
    ...networkErrors,
    ...plaidErrors,
  };

  // Find matching error message
  for (const [errorCode, message] of Object.entries(allErrors)) {
    if (code.includes(errorCode)) {
      return message;
    }
  }

  // Special cases
  if (code.includes('not-found') || code.includes('NOT_FOUND')) {
    return 'The requested item could not be found.';
  }

  if (code.includes('permission') || code.includes('PERMISSION')) {
    return "You don't have permission to perform this action.";
  }

  if (code.includes('timeout') || code.includes('TIMEOUT')) {
    return 'Request timed out. Please try again.';
  }

  if (code.includes('network') || code.includes('NETWORK')) {
    return 'Network error. Please check your connection.';
  }

  // Default error message
  return 'Something went wrong. Please try again.';
};

/**
 * Get friendly error title based on error type
 */
export const getErrorTitle = (error: any): string => {
  const code = error?.code || error?.message || String(error);

  if (code.includes('auth/')) {
    return 'Authentication Error';
  }

  if (code.includes('firestore/')) {
    return 'Data Error';
  }

  if (code.includes('network') || code.includes('NETWORK')) {
    return 'Connection Error';
  }

  if (code.includes('plaid') || code.includes('PLAID') || code.includes('ITEM')) {
    return 'Bank Connection Error';
  }

  return 'Error';
};

/**
 * Format error for display in Alert
 */
export const formatErrorForAlert = (
  error: any
): { title: string; message: string } => {
  return {
    title: getErrorTitle(error),
    message: getFriendlyErrorMessage(error),
  };
};
