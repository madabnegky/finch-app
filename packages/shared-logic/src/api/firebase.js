import { initializeApp } from "firebase/app";
import {
    getAuth,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    connectAuthEmulator,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithPopup,
    EmailAuthProvider,
    linkWithCredential
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// --- START OF THE DEFINITIVE FIX ---
// This simplified block removes the complex Codespaces URL detection.
// We will now ALWAYS connect to localhost when in development mode.
// The Codespaces environment and browser are designed to correctly
// forward requests from `localhost:<port>` to the right place.
// This eliminates the origin mismatch that causes the CORS error.
if (import.meta.env.DEV) {
    const host = 'localhost';
    console.log(`Development mode: Connecting Firebase Emulators to ${host}.`);
    try {
        connectAuthEmulator(auth, `http://${host}:9099`);
        connectFirestoreEmulator(db, host, 8080);
        connectFunctionsEmulator(functions, host, 5001);
        console.log(`Successfully configured emulators.`);
    } catch (error) {
        console.error("Error connecting to Firebase Emulators:", error);
    }
}
// --- END OF THE DEFINITIVE FIX ---


const googleProvider = new GoogleAuthProvider();

const api = {
  app,
  auth,
  firestore: db,
  functions,
  signOut: () => signOut(auth),
  signUp: (email, password) => createUserWithEmailAndPassword(auth, email, password),
  signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
  signInGuest: () => signInAnonymously(auth),
  signInWithGoogle: () => signInWithPopup(auth, googleProvider),
  linkAccountWithGoogle: () => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      return linkWithPopup(auth.currentUser, googleProvider);
    }
    return Promise.reject(new Error("No anonymous user is currently signed in."));
  },
  linkAccountWithEmail: (email, password) => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      return linkWithCredential(auth.currentUser, credential);
    }
    return Promise.reject(new Error("No anonymous user is currently signed in."));
  }
};

export default api;
