import React, { useState, useEffect, useContext, createContext } from 'react';
import api from '../api/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(api.auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
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