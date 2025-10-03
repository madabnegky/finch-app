import React, { useState, useEffect, useContext, createContext } from 'react';
// FIX: Changed to a default import to correctly get the 'api' object.
import api from '../api/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // FIX: Use the 'auth' object from the imported 'api'
        const unsubscribe = onAuthStateChanged(api.auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInGuest = async () => {
        try {
            // FIX: Use the 'signInAnonymously' function from the imported 'api'
            const userCredential = await api.signInAnonymously(api.auth);
            setUser(userCredential.user);
            setLoading(false);
            return userCredential;
        } catch (error)
        {
            console.error("Anonymous sign-in failed", error);
        }
    };

    const value = {
        user,
        loading,
        // FIX: Reference the functions from the 'api' object
        signIn: (email, password) => api.signIn(email, password),
        signUp: (email, password) => api.signUp(email, password),
        signOut: () => api.signOut(),
        signInGuest,
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