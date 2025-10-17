// React Native Firebase API
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Note: React Native Firebase doesn't need initializeApp - it reads from google-services.json
// The app is automatically initialized when you import the modules

const api = {
  auth: auth(),
  firestore: firestore(),

  // Authentication methods
  signOut: () => auth().signOut(),

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

  // Note: Google Sign In on React Native requires additional setup
  // For now, we'll return a promise that rejects
  signInWithGoogle: () => {
    return Promise.reject(new Error('Google Sign In not yet implemented on mobile'));
  },

  linkAccountWithGoogle: () => {
    return Promise.reject(new Error('Google linking not yet implemented on mobile'));
  },

  linkAccountWithEmail: async (email, password) => {
    const currentUser = auth().currentUser;
    if (currentUser && currentUser.isAnonymous) {
      const credential = auth.EmailAuthProvider.credential(email, password);
      return currentUser.linkWithCredential(credential);
    }
    return Promise.reject(new Error('No anonymous user is currently signed in.'));
  },
};

export default api;
