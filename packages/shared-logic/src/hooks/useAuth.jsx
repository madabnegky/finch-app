import { useState, useEffect, useContext, createContext } from 'react';

// Detect platform - check if we're in a React Native environment
let api;
let onAuthStateChanged;

// Detect React Native by checking if Platform module exists
let isReactNative = false;
try {
    // Try to require Platform - if it exists, we're in React Native
    const { Platform } = require('react-native');
    isReactNative = Platform.OS !== 'web';
} catch (e) {
    // If require fails, we're in web
    isReactNative = false;
}

if (isReactNative) {
    // React Native uses @react-native-firebase
    api = require('../api/firebase.native').default;
    // React Native Firebase auth().onAuthStateChanged returns the unsubscribe function directly
    onAuthStateChanged = (auth, callback) => {
        return auth.onAuthStateChanged(callback);
    };
} else {
    // Web uses the regular Firebase JS SDK
    api = require('../api/firebase').default;
    const firebaseAuth = require('firebase/auth');
    onAuthStateChanged = firebaseAuth.onAuthStateChanged;
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AuthProvider - Setting up auth state listener');

        // Check if there's already a signed-in user
        const currentUser = api.auth.currentUser;
        if (currentUser) {
            console.log('AuthProvider - Found existing user:', currentUser.uid);
            setUser(currentUser);
            setLoading(false);
        }

        // Subscribe to auth changes
        const unsubscribe = onAuthStateChanged(api.auth, (user) => {
            console.log('AuthProvider - Auth state changed:', user ? `User ${user.uid} (anonymous: ${user.isAnonymous})` : 'No user');
            setUser(user);
            setLoading(false);
        });

        return () => {
            console.log('AuthProvider - Cleaning up auth state listener');
            unsubscribe();
        };
    }, []);

    const value = {
        user,
        loading,
        signIn: api.signIn,
        signUp: api.signUp,
        signOut: api.signOut,
        signInGuest: api.signInGuest,
        signInWithGoogle: api.signInWithGoogle,
        linkAccountWithGoogle: api.linkAccountWithGoogle,
        linkAccountWithEmail: api.linkAccountWithEmail,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};