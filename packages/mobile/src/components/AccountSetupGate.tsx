// packages/mobile/src/components/AccountSetupGate.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '../types/navigation';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
};

type AccountSetupGateProps = {
  children: React.ReactNode;
};

export const AccountSetupGate: React.FC<AccountSetupGateProps> = ({ children }) => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  useEffect(() => {
    const checkAccounts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const firestore = require('@react-native-firebase/firestore').default;
        const accountsSnapshot = await firestore()
          .collection(`users/${user.uid}/accounts`)
          .get();

        const accountsExist = !accountsSnapshot.empty;
        setHasAccounts(accountsExist);

        // If no accounts, redirect to setup
        if (!accountsExist) {
          console.log('No accounts found, redirecting to setup...');
          navigation.replace('Setup');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking accounts:', error);
        setLoading(false);
      }
    };

    checkAccounts();
  }, [user, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primaryBlue} />
        <Text style={styles.loadingText}>Checking setup status...</Text>
      </View>
    );
  }

  // If user has accounts, render children (Dashboard)
  if (hasAccounts) {
    return <>{children}</>;
  }

  // Otherwise, show nothing (navigation.replace will handle routing)
  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: brandColors.textDark,
  },
});
