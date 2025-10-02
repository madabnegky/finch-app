import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/hooks/useAuth';
import { db } from '@shared/api/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

// This component checks if a user has accounts. If not, it forces them to the setup page.
function AccountSetupGate({ children }) {
    const { user } = useAuth();
    const [hasAccounts, setHasAccounts] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const checkAccounts = async () => {
            const accountsCol = collection(db, `users/${user.uid}/accounts`);
            const q = query(accountsCol);
            const querySnapshot = await getDocs(q);

            setHasAccounts(!querySnapshot.empty);
            setIsLoading(false);
        };

        checkAccounts();
    }, [user]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    // If the user has no accounts, redirect them to the setup wizard
    if (!hasAccounts) {
        return <Navigate to="/setup" replace />;
    }

    // Otherwise, show them the main app
    return children;
}

export default AccountSetupGate;