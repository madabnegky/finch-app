import React from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
// FIX: Import the 'collection' function from firestore
import { collection } from "firebase/firestore";
import api from '@shared/api/firebase';
import { useAuth } from '@shared/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

const AccountSetupGate = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // FIX: Use the imported 'collection' function with the firestore instance
  const [accounts, accountsLoading, error] = useCollection(
    user ? collection(api.firestore, `users/${user.uid}/accounts`) : null
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