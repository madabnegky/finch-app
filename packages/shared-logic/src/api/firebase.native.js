// React Native Firebase API
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Note: React Native Firebase doesn't need initializeApp - it reads from google-services.json
// The app is automatically initialized when you import the modules

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: '271671331037-90pnnqenl2enkc9es1gr6qcer1ugf8at.apps.googleusercontent.com',
});

const api = {
  auth: auth(),
  firestore: firestore(),

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
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token
      const { idToken } = await GoogleSignin.signIn();
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

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the users ID token
      const { idToken } = await GoogleSignin.signIn();
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // Link the credential to the current user
      const result = await currentUser.linkWithCredential(googleCredential);
      // Reload the user to get the latest data
      await auth().currentUser.reload();
      return result;
    } catch (error) {
      console.error('Google Account Linking error:', error);
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
};

export default api;
