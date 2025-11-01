// React Native Firebase API
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Note: React Native Firebase doesn't need initializeApp - it reads from google-services.json
// The app is automatically initialized when you import the modules

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: '271671331037-90pnnqenl2enkc9es1gr6qcer1ugf8at.apps.googleusercontent.com',
  offlineAccess: false, // We don't need serverAuthCode for Firebase
  forceCodeForRefreshToken: false,
  // Force account selection - don't auto-select previously used account
  // Note: This is a hint to Google, but doesn't guarantee account picker on all devices
});

const api = {
  get auth() {
    return auth();
  },
  get firestore() {
    return firestore();
  },

  // Authentication methods
  signOut: async () => {
    await auth().signOut();
    // Also sign out from Google
    if (await GoogleSignin.isSignedIn()) {
      await GoogleSignin.signOut();
    }
  },

  signUp: async (email, password) => {
    return auth().createUserWithEmailAndPassword(email, password);
  },

  signIn: async (email, password) => {
    return auth().signInWithEmailAndPassword(email, password);
  },

  signInGuest: async () => {
    const result = await auth().signInAnonymously();
    // Force a re-check of auth state by manually calling the listener
    const currentUser = auth().currentUser;
    console.log('firebase.native - After signIn, currentUser is:', currentUser?.uid);
    return result;
  },

  signInWithGoogle: async () => {
    try {
      // Sign out from Google first to force account selection
      try {
        if (await GoogleSignin.isSignedIn()) {
          console.log('📤 Signing out from previous Google session to show account picker...');
          await GoogleSignin.signOut();
        }
      } catch (signOutError) {
        console.log('⚠️ Could not sign out from Google:', signOutError.message);
      }

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token - will show account picker since we signed out
      const userInfo = await GoogleSignin.signIn();
      // Handle both old and new response structures
      const idToken = userInfo.idToken || userInfo.data?.idToken;

      if (!idToken) {
        console.error('No idToken found in response:', userInfo);
        throw new Error('Failed to get idToken from Google Sign In');
      }

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // Sign-in the user with the credential
      return auth().signInWithCredential(googleCredential);
    } catch (error) {
      console.error('Google Sign In error:', error);
      throw error;
    }
  },

  linkAccountWithGoogle: async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error('No anonymous user is currently signed in.');
      }

      console.log('🔗 Starting Google account linking for anonymous user:', currentUser.uid);

      // AGGRESSIVE SIGN OUT - Sign out from both Google and clear cached tokens
      try {
        console.log('📤 Clearing Google session and cached tokens...');
        if (await GoogleSignin.isSignedIn()) {
          await GoogleSignin.revokeAccess(); // Revoke access tokens
          await GoogleSignin.signOut(); // Sign out
        }
        console.log('✅ Google session cleared');
      } catch (signOutError) {
        console.log('⚠️ Could not clear Google session:', signOutError.message);
        // Continue anyway
      }

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the users ID token and user info
      // Android will show account picker after revokeAccess
      console.log('📱 Opening Google Sign In (should show account picker)...');
      const signInResult = await GoogleSignin.signIn();

      // Handle both old and new response structures
      const idToken = signInResult.idToken || signInResult.data?.idToken;
      const googleUser = signInResult.user || signInResult.data?.user;

      console.log('✅ Google Sign In completed, idToken received:', !!idToken);
      console.log('🔍 Sign-in result structure:', { hasIdToken: !!idToken, hasUser: !!googleUser, keys: Object.keys(signInResult) });

      if (!idToken) {
        console.error('❌ No idToken found in response:', signInResult);
        throw new Error('Google Sign In did not return an ID token. Please try again.');
      }

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Link the credential to the current user
      console.log('🔗 Linking credential...');
      const result = await currentUser.linkWithCredential(googleCredential);
      console.log('✅ Account linked successfully!');

      // Update the user's profile with their Google name and photo
      if (googleUser) {
        console.log('📝 Updating user profile with Google info...');
        await currentUser.updateProfile({
          displayName: googleUser.name || googleUser.givenName,
          photoURL: googleUser.photo,
        });
        console.log('✅ Profile updated with name:', googleUser.name);
      }

      // Reload the user to get the latest data
      await auth().currentUser.reload();
      return result;
    } catch (error) {
      console.error('❌ Google Account Linking error:', error);
      if (error.code === '12501') {
        throw new Error('Google Sign In was canceled. Please try again.');
      }
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This Google account is already linked to another Finch account. Please choose a different Google account.');
      }
      throw error;
    }
  },

  linkAccountWithEmail: async (email, password) => {
    const currentUser = auth().currentUser;
    if (currentUser && currentUser.isAnonymous) {
      const credential = auth.EmailAuthProvider.credential(email, password);
      const result = await currentUser.linkWithCredential(credential);
      // Reload the user to get the latest data
      await auth().currentUser.reload();
      return result;
    }
    return Promise.reject(new Error('No anonymous user is currently signed in.'));
  },

  syncGoogleProfile: async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || currentUser.isAnonymous) {
        console.log('syncGoogleProfile - No authenticated user or user is anonymous, skipping');
        return;
      }

      // Check if user already has Google provider linked
      const googleProvider = currentUser.providerData.find(
        provider => provider.providerId === 'google.com'
      );

      if (!googleProvider) {
        console.log('syncGoogleProfile - User not linked with Google, skipping');
        return;
      }

      // Use the display name and photo from the Google provider data
      console.log('🔄 Syncing Google profile info...');
      if (googleProvider.displayName) {
        await currentUser.updateProfile({
          displayName: googleProvider.displayName,
          photoURL: googleProvider.photoURL,
        });
        console.log('✅ Profile synced with Google info:', googleProvider.displayName);

        // Reload to get updated data
        await auth().currentUser.reload();
      } else {
        console.log('⚠️ No displayName found in Google provider data');
      }
    } catch (error) {
      console.error('syncGoogleProfile - Error:', error);
      // Don't throw - this is a non-critical operation
    }
  },
};

export default api;
