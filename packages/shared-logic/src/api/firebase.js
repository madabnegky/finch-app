import { initializeApp } from "firebase/app";
import { getAuth, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// This config now safely reads from your .env.local file
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

const appId = import.meta.env.VITE_APP_ID || 'default-finch-app';

// This block is run in development mode only
if (import.meta.env.DEV) {
    console.log("Development mode: Connecting to Firebase Emulators on localhost.");
    try {
        // --- THIS IS THE FIX ---
        // We now connect to the emulators using their direct localhost address and port.
        // This is the standard and most reliable method.

        connectAuthEmulator(auth, 'http://127.0.0.1:9099');
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);

        console.log(`Successfully configured emulators to use localhost.`);
    } catch (error) {
        console.error("Error connecting to Firebase Emulators:", error);
    }
}

export const signOutUser = () => signOut(auth);
export const createUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const signInUser = (email, password) => signInWithEmailAndPassword(auth, email, password);

export { app, auth, db, functions, appId, signInAnonymously };