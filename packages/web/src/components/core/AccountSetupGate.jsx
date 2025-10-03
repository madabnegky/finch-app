import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import api from '@shared/api/firebase';
import { useAuth } from '@shared/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

const AccountSetupGate = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // FIX: Corrected the invalid destructuring syntax.
  const [accounts, accountsLoading, error] = useCollection(
    user ? api.firestore.collection(`users/${user.uid}/accounts`) : null
  );

  if (authLoading || accountsLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    console.error("Error fetching accounts for gate:", error);
    return <div>Error: Could not verify account setup. Please try again later.</div>;
  }

  if (user && (!accounts || accounts.docs.length === 0)) {
    return <Navigate to="/setup" />;
  }

  return children;
};

export default AccountSetupGate;