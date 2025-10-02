import React, { useState, useEffect, useContext, createContext } from 'react';
import { auth, signInUser, createUser, signOutUser, signInAnonymously } from '../api/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- THIS IS THE FIX ---
    // We've made signInGuest an async function that manually sets the user
    // and loading state immediately after the anonymous sign-in succeeds.
    const signInGuest = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            setUser(userCredential.user); // Manually set the user
            setLoading(false);             // Manually turn off the loading screen
            return userCredential;
        } catch (error) {
            console.error("Anonymous sign-in failed", error);
        }
    };

    const value = {
        user,
        loading,
        signIn: (email, password) => signInUser(email, password),
        signUp: (email, password) => createUser(email, password),
        signOut: () => signOutUser(),
        signInGuest, // Use our new async function
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