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

        let hasHandledInitialState = false;
        let isSyncingProfile = false;

        // Subscribe to auth changes
        const unsubscribe = onAuthStateChanged(api.auth, async (user) => {
            console.log('AuthProvider - Auth state changed:', user ? `User ${user.uid} (anonymous: ${user.isAnonymous})` : 'No user');

            // If no user and this is the first state change, auto-sign in as guest
            if (!user && !hasHandledInitialState) {
                hasHandledInitialState = true;
                console.log('AuthProvider - No user found, signing in as guest...');
                try {
                    await api.signInGuest();
                    // The auth state change will trigger again with the anonymous user
                } catch (error) {
                    console.error('AuthProvider - Failed to sign in as guest:', error);
                    setLoading(false);
                }
            } else {
                // Sync Google profile info if user is linked with Google but missing displayName
                if (user && !user.isAnonymous && !user.displayName && !isSyncingProfile) {
                    isSyncingProfile = true;
                    try {
                        await api.syncGoogleProfile();
                    } catch (error) {
                        console.error('AuthProvider - Failed to sync Google profile:', error);
                    } finally {
                        isSyncingProfile = false;
                    }
                }

                setUser(user);
                setLoading(false);
                hasHandledInitialState = true;
            }
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