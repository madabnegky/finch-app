import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// The firebaseConfig object remains the same
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// NEW: This block tells our app to use the local emulator when in development mode.
if (import.meta.env.DEV) {
  console.log("Connecting to local Firebase emulators");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const appId = import.meta.env.VITE_APP_ID || 'default-finch-app';

// Function to handle user sign-out
export const signOutUser = () => {
  return signOut(auth);
};

export { auth, db, appId };