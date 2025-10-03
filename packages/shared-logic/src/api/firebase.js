import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously, 
    connectAuthEmulator 
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

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

if (import.meta.env.DEV) {
    // FIX: Use window.location.hostname to dynamically set the host.
    // This is the most robust method for containerized environments.
    const host = window.location.hostname;
    console.log(`Development mode: Connecting to Firebase Emulators on ${host}.`);
    try {
        connectAuthEmulator(auth, `http://${host}:9099`);
        connectFirestoreEmulator(db, host, 8080);
        connectFunctionsEmulator(functions, host, 5001);
        console.log(`Successfully configured emulators.`);
    } catch (error) {
        console.error("Error connecting to Firebase Emulators:", error);
    }
}

const signOutUser = () => signOut(auth);
const createUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);
const signInUser = (email, password) => signInWithEmailAndPassword(auth, email, password);

const api = {
  app,
  auth,
  firestore: db,
  functions,
  signOut: signOutUser,
  signUp: createUser,
  signIn: signInUser,
  signInAnonymously
};

export default api;