// CONCEPT 4: "Executive Refined" Design
// - Clean, single account card with dropdown switcher
// - Professional layout with better spacing
// - Focus on Available to Spend with clear visual hierarchy
// - Polished data presentation
// **WITH FULL BACKEND INTEGRATION**

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { generateTransactionInstances } from '../utils/transactionInstances';
import { WhatIfModal } from '../components/WhatIfModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { ManageAccountModal } from '../components/ManageAccountModal';
import { TransferModal } from '../components/TransferModal';
import { PlaidAccountPicker } from '../components/PlaidAccountPicker';
import { usePlaidLink } from '../components/PlaidLinkHandler';
import FinchLogo from '../components/FinchLogo';
import functions from '@react-native-firebase/functions';
import brandColors from '../theme/colors';
import { accountIcons } from '../theme/icons';

type Account = {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  cushion: number;
  availableToSpend: number;
  goalAllocations: number;
  plaidAccountId?: string;
  plaidItemId?: string;
  isPrimary?: boolean;
};

type Transaction = {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
  accountId?: string;
  isRecurring: boolean;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
};

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  accountId: string;
};

export const DashboardConcept4 = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfTransaction, setWhatIfTransaction] = useState<any>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);

  // DEBUG: Test if modal works at all
  useEffect(() => {
    console.log('🟢 showManageAccount changed to:', showManageAccount);
  }, [showManageAccount]);

  // Plaid state
  const [triggerPlaid, setTriggerPlaid] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [showPlaidPicker, setShowPlaidPicker] = useState(false);
  const [plaidData, setPlaidData] = useState<any>(null);

  // Fetch accounts with goal allocations
  useEffect(() => {
    if (!user) return;

    const unsubscribeAccounts = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot(
        async (snapshot) => {
          try {
            const goalsSnapshot = await firestore()
              .collection(`users/${user.uid}/goals`)
              .get();

            const accountsData = snapshot.docs.map(doc => {
              const data = doc.data();

              const totalAllocatedToGoals = goalsSnapshot.docs
                .filter(goalDoc => goalDoc.data().accountId === doc.id)
                .reduce((sum, goalDoc) => sum + (goalDoc.data().allocatedAmount || 0), 0);

              const availableToSpend = (data.currentBalance || 0) - (data.cushion || 0) - totalAllocatedToGoals;

              return {
                id: doc.id,
                name: data.name || 'Unnamed Account',
                type: data.type || 'checking',
                currentBalance: data.currentBalance || 0,
                cushion: data.cushion || 0,
                availableToSpend,
                goalAllocations: totalAllocatedToGoals,
                isPrimary: data.isPrimary || false,
              };
            });

            // Sort accounts: primary first, then by name
            accountsData.sort((a, b) => {
              if (a.isPrimary && !b.isPrimary) return -1;
              if (!a.isPrimary && b.isPrimary) return 1;
              return a.name.localeCompare(b.name);
            });

            setAccounts(accountsData);

            // Set default selected account to primary account, or first one if no primary set
            if (!selectedAccountId && accountsData.length > 0) {
              const primaryAccount = accountsData.find(acc => acc.isPrimary);
              setSelectedAccountId(primaryAccount ? primaryAccount.id : accountsData[0].id);
            }

            setError(null);
            setLoading(false);
          } catch (err) {
            console.error('Error fetching accounts:', err);
            setError('Unable to load accounts. Please check your connection.');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error in accounts snapshot:', err);
          setError('Unable to connect to database. Please check your connection.');
          setLoading(false);
        }
      );

    const unsubscribeTransactions = firestore()
      .collection(`users/${user.uid}/transactions`)
      .onSnapshot((snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Transaction));
        setTransactions(transactionsData);
      });

    const unsubscribeGoals = firestore()
      .collection(`users/${user.uid}/goals`)
      .onSnapshot((snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Goal));
        setGoals(goalsData);
      });

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
      unsubscribeGoals();
    };
  }, [user]);

  // Plaid handlers
  const handlePlaidSuccess = async (publicToken: string) => {
    console.log('🟢 DashboardConcept4: Plaid success, exchanging token...');
    setTriggerPlaid(false);

    try {
      setPlaidLoading(true);

      const exchangeToken = functions().httpsCallable('exchangePublicToken');
      const exchangeResult = await exchangeToken({ publicToken });

      const { itemId, plaidAccounts, institutionName } = exchangeResult.data as any;

      console.log(`🟢 DashboardConcept4: Got ${plaidAccounts.length} accounts from ${institutionName}`);

      setPlaidData({
        itemId,
        plaidAccounts,
        institutionName,
      });

      setPlaidLoading(false);
      setShowPlaidPicker(true);
    } catch (error: any) {
      console.error('Token exchange error:', error);
      Alert.alert('Error', 'Failed to connect to your bank. Please try again.');
      setPlaidLoading(false);
    }
  };

  const handlePlaidExit = () => {
    console.log('❌ DashboardConcept4: Plaid exited');
    setPlaidLoading(false);
    setTriggerPlaid(false);
  };

  const handlePlaidReset = () => {
    setTriggerPlaid(false);
  };

  // Initialize Plaid link handler
  usePlaidLink({
    trigger: triggerPlaid,
    onSuccess: handlePlaidSuccess,
    onExit: handlePlaidExit,
    onReset: handlePlaidReset,
  });

  const handleAddAccountWithPlaid = () => {
    console.log('🟢 DashboardConcept4: Starting Plaid flow');
    setFabExpanded(false);
    setTriggerPlaid(true);
  };

  const handlePlaidAccountsSelected = async (selectedAccounts: any[]) => {
    try {
      console.log(`🟢 DashboardConcept4: Processing ${selectedAccounts.length} selected accounts`);

      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      for (const selection of selectedAccounts) {
        const { plaidAccountId, account, cushion } = selection;

        const accountRef = await firestore()
          .collection(`users/${user.uid}/accounts`)
          .add({
            name: account.name || account.officialName,
            type: account.subtype || 'checking',
            currentBalance: account.currentBalance || 0,
            cushion: cushion || 0,
            plaidAccountId,
            plaidItemId: plaidData.itemId,
            linkedAt: firestore.FieldValue.serverTimestamp(),
            lastPlaidBalance: account.currentBalance || 0,
            lastBalanceSyncAt: firestore.FieldValue.serverTimestamp(),
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        console.log(`✅ Created account ${accountRef.id} for ${account.name}`);

        try {
          const syncTransactions = functions().httpsCallable('syncTransactions');
          await syncTransactions({
            itemId: plaidData.itemId,
            accountId: accountRef.id,
          });
          console.log(`✅ Synced transactions for account ${accountRef.id}`);
        } catch (syncError) {
          console.warn(`⚠️ Failed to sync transactions for ${accountRef.id}:`, syncError);
        }

        try {
          const identifyRecurring = functions().httpsCallable('identifyRecurringTransactions');
          await identifyRecurring({
            itemId: plaidData.itemId,
            accountId: accountRef.id,
          });
          console.log(`✅ Identified recurring transactions for account ${accountRef.id}`);
        } catch (recurringError) {
          console.warn(`⚠️ Failed to identify recurring transactions for ${accountRef.id}:`, recurringError);
        }
      }

      setShowPlaidPicker(false);
      setPlaidData(null);

      Alert.alert(
        'Success!',
        `${selectedAccounts.length} account${selectedAccounts.length > 1 ? 's' : ''} added successfully!`
      );
    } catch (error) {
      console.error('Error creating Plaid accounts:', error);
      Alert.alert('Error', 'Failed to add accounts. Please try again.');
    }
  };

  // Generate transaction instances including what-if scenario
  const allTransactionInstances = useMemo(() => {
    const instances = generateTransactionInstances(transactions, 60);

    // Add what-if transaction if present
    if (whatIfTransaction) {
      instances.push(whatIfTransaction);
    }

    return instances.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [transactions, whatIfTransaction]);

  // Calculate upcoming bills (next 30 days)
  const upcomingBills = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return allTransactionInstances
      .filter(txn => {
        const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
        return (
          txn.type === 'expense' &&
          txn.accountId === selectedAccountId &&
          txnDate >= now &&
          txnDate <= thirtyDaysFromNow
        );
      })
      .slice(0, 3)
      .map(txn => {
        const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);

        // Format date using UTC to avoid timezone shifts
        const month = txnDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
        const day = txnDate.getUTCDate();
        const formattedDate = `${month} ${day}`;

        const daysAway = Math.ceil((txnDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return {
          name: txn.description || txn.name || 'Unnamed',
          amount: Math.abs(txn.amount),
          date: formattedDate,
          daysAway,
          category: txn.category || 'other',
          type: txn.type,
        };
      });
  }, [allTransactionInstances, selectedAccountId]);

  // Calculate total upcoming bills amount
  const totalUpcomingBills = useMemo(() => {
    return upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
  }, [upcomingBills]);

  // Calculate upcoming income (next 30 days) - for display only, not for available to spend
  const totalUpcomingIncome = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return allTransactionInstances
      .filter(txn => {
        const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
        return (
          txn.type === 'income' &&
          txn.accountId === selectedAccountId &&
          txnDate >= now &&
          txnDate <= thirtyDaysFromNow
        );
      })
      .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
  }, [allTransactionInstances, selectedAccountId]);

  // Recalculate selected account with correct availableToSpend
  // Available to Spend = lowest balance you'll hit (considering all income/expenses) - cushion - goals
  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return null;

    // Calculate the lowest balance point over next 30 days by simulating all transactions
    let runningBalance = account.currentBalance;
    let lowestBalance = runningBalance;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const relevantTransactions = allTransactionInstances
      .filter(txn => {
        const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
        return txn.accountId === selectedAccountId && txnDate >= now && txnDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

    // Simulate each transaction to find the lowest point
    relevantTransactions.forEach(txn => {
      runningBalance += txn.amount; // income is positive, expenses are negative
      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
      }
    });

    // Available to spend = lowest balance - cushion - goal allocations
    const correctAvailableToSpend = lowestBalance - account.cushion - account.goalAllocations;

    return {
      ...account,
      availableToSpend: correctAvailableToSpend,
    };
  }, [selectedAccountId, accounts, allTransactionInstances]);

  // Calculate 60-day projection low
  const projection60DayLow = useMemo(() => {
    if (!selectedAccount) return 0;

    let runningBalance = selectedAccount.currentBalance;
    let lowestBalance = runningBalance;

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const relevantTransactions = allTransactionInstances.filter(txn => {
      const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
      return txn.accountId === selectedAccountId && txnDate >= now && txnDate <= sixtyDaysFromNow;
    });

    relevantTransactions.forEach(txn => {
      runningBalance += txn.amount;
      if (runningBalance < lowestBalance) {
        lowestBalance = runningBalance;
      }
    });

    return lowestBalance;
  }, [allTransactionInstances, selectedAccountId, selectedAccount]);

  // Calculate protection days (how many days until balance goes negative)
  const protectionDays = useMemo(() => {
    if (!selectedAccount) return 0;

    let runningBalance = selectedAccount.availableToSpend;
    const now = new Date();

    const relevantTransactions = allTransactionInstances.filter(txn => {
      const txnDate = txn.date instanceof Date ? txn.date : new Date(txn.date);
      return txn.accountId === selectedAccountId && txnDate >= now;
    });

    for (let i = 0; i < relevantTransactions.length; i++) {
      runningBalance += relevantTransactions[i].amount;
      if (runningBalance < 0) {
        const txnDate = relevantTransactions[i].date instanceof Date
          ? relevantTransactions[i].date
          : new Date(relevantTransactions[i].date);
        return Math.ceil((txnDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    return 60; // If balance stays positive for 60+ days
  }, [allTransactionInstances, selectedAccountId, selectedAccount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Get icon and color for transaction category
  const getCategoryIcon = (category: string, type: string) => {
    const categoryLower = category?.toLowerCase() || '';

    // Income categories
    if (type === 'income') {
      if (categoryLower.includes('salary') || categoryLower.includes('paycheck')) {
        return { icon: 'cash-multiple', color: brandColors.success };
      }
      return { icon: 'cash-plus', color: brandColors.success };
    }

    // Expense categories
    if (categoryLower.includes('housing') || categoryLower.includes('rent') || categoryLower.includes('mortgage')) {
      return { icon: 'home', color: brandColors.error };
    }
    if (categoryLower.includes('food') || categoryLower.includes('groceries') || categoryLower.includes('dining')) {
      return { icon: 'food', color: brandColors.orangeAccent };
    }
    if (categoryLower.includes('transport') || categoryLower.includes('car') || categoryLower.includes('gas')) {
      return { icon: 'car', color: brandColors.tealPrimary };
    }
    if (categoryLower.includes('utilities') || categoryLower.includes('electric') || categoryLower.includes('water')) {
      return { icon: 'lightning-bolt', color: brandColors.orangeAccent };
    }
    if (categoryLower.includes('entertainment') || categoryLower.includes('streaming')) {
      return { icon: 'television', color: '#8B5CF6' };
    }
    if (categoryLower.includes('shopping') || categoryLower.includes('retail')) {
      return { icon: 'shopping', color: '#8B5CF6' };
    }
    if (categoryLower.includes('health') || categoryLower.includes('medical')) {
      return { icon: 'hospital-box', color: brandColors.error };
    }
    if (categoryLower.includes('insurance')) {
      return { icon: 'shield-check', color: brandColors.tealPrimary };
    }
    if (categoryLower.includes('education') || categoryLower.includes('school')) {
      return { icon: 'school', color: brandColors.tealPrimary };
    }

    // Default
    return { icon: 'calendar-clock', color: brandColors.error };
  };

  const handleTogglePrimaryAccount = async (accountId: string) => {
    if (!user) return;

    try {
      const batch = firestore().batch();

      // Remove isPrimary from all accounts
      accounts.forEach(account => {
        const accountRef = firestore().doc(`users/${user.uid}/accounts/${account.id}`);
        batch.update(accountRef, { isPrimary: false });
      });

      // Set the selected account as primary
      const targetAccountRef = firestore().doc(`users/${user.uid}/accounts/${accountId}`);
      batch.update(targetAccountRef, { isPrimary: true });

      await batch.commit();
      console.log(`✅ Set account ${accountId} as primary`);
    } catch (error) {
      console.error('Error setting primary account:', error);
      Alert.alert('Error', 'Failed to set primary account. Please try again.');
    }
  };

  const handleWhatIfSimulate = (transaction: any) => {
    setWhatIfTransaction(transaction);
    setShowWhatIf(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => (navigation as any).openDrawer()}
              >
                <Icon name="menu" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FinchLogo size={32} />
              </View>
              <View>
                {user?.isAnonymous ? (
                  <Text style={styles.headerTitle}>Dashboard</Text>
                ) : (
                  <>
                    <Text style={styles.headerGreeting}>Dashboard</Text>
                    <Text style={styles.headerName}>{user?.displayName || user?.email?.split('@')[0] || 'there'}</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIconContainer, { backgroundColor: brandColors.error + '15' }]}>
              <Icon name="alert-circle-outline" size={80} color={brandColors.error} />
            </View>
            <Text style={styles.emptyText}>Connection Error</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                setLoading(true);
                setError(null);
              }}
            >
              <Icon name="refresh" size={20} color={brandColors.white} />
              <Text style={styles.emptyButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyButtonSecondary}
              onPress={() => (navigation as any).openDrawer()}
            >
              <Text style={styles.emptyButtonSecondaryText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODALS FOR ERROR STATE */}
        <ManageAccountModal
          visible={showManageAccount}
          onClose={() => setShowManageAccount(false)}
          onSuccess={() => {
            console.log('Account saved successfully!');
          }}
          account={null}
        />
      </View>
    );
  }

  if (!selectedAccount) {
    return (
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => (navigation as any).openDrawer()}
              >
                <Icon name="menu" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FinchLogo size={32} />
              </View>
              <View>
                {user?.isAnonymous ? (
                  <Text style={styles.headerTitle}>Dashboard</Text>
                ) : (
                  <>
                    <Text style={styles.headerGreeting}>Welcome</Text>
                    <Text style={styles.headerName}>{user?.displayName || user?.email?.split('@')[0] || 'there'}</Text>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Icon name="wallet-plus-outline" size={80} color={brandColors.tealPrimary} />
            </View>
            <Text style={styles.emptyText}>No accounts yet</Text>
            <Text style={styles.emptySubtext}>
              Get started by adding your first bank account to track your finances
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowManageAccount(true)}
            >
              <Icon name="plus-circle" size={20} color={brandColors.white} />
              <Text style={styles.emptyButtonText}>Add Manual Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: brandColors.tealPrimary }]}
              onPress={handleAddAccountWithPlaid}
            >
              <Icon name="bank-plus" size={20} color={brandColors.white} />
              <Text style={styles.emptyButtonText}>Connect Bank (Plaid)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyButtonSecondary}
              onPress={() => (navigation as any).openDrawer()}
            >
              <Text style={styles.emptyButtonSecondaryText}>Browse Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODALS FOR EMPTY STATE */}
        <ManageAccountModal
          visible={showManageAccount}
          onClose={() => setShowManageAccount(false)}
          onSuccess={() => {
            console.log('Account saved successfully!');
          }}
          account={null}
        />

        {plaidData && (
          <PlaidAccountPicker
            visible={showPlaidPicker}
            institutionName={plaidData.institutionName}
            plaidAccounts={plaidData.plaidAccounts}
            onSelect={handlePlaidAccountsSelected}
            onCancel={() => {
              setShowPlaidPicker(false);
              setPlaidData(null);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => (navigation as any).openDrawer()}
              >
                <Icon name="menu" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FinchLogo size={32} />
              </View>
              <View>
                {user?.isAnonymous ? (
                  <Text style={styles.headerTitle}>Dashboard</Text>
                ) : (user?.displayName || user?.email) ? (
                  <>
                    <Text style={styles.headerGreeting}>
                      {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
                    </Text>
                    <Text style={styles.headerName}>{user?.displayName || user?.email?.split('@')[0]}</Text>
                  </>
                ) : (
                  <Text style={styles.headerTitle}>Dashboard</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profileInitial}>
                    {(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* GUEST MODE BANNER */}
        {user?.isAnonymous && (
          <View style={styles.guestBanner}>
            <View style={styles.guestBannerContent}>
              <Icon name="account-alert" size={20} color={brandColors.orangeAccent} />
              <Text style={styles.guestBannerText}>
                Guest Mode - Your data is temporary
              </Text>
            </View>
            <TouchableOpacity
              style={styles.guestBannerButton}
              onPress={() => (navigation as any).navigate('Settings')}
            >
              <Text style={styles.guestBannerButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WHAT IF BANNER */}
        {whatIfTransaction && (
          <View style={styles.whatIfBanner}>
            <View style={styles.whatIfContent}>
              <Icon name="lightbulb-on" size={20} color={brandColors.orangeAccent} />
              <Text style={styles.whatIfText}>
                Testing: {whatIfTransaction.description} ({formatCurrency(Math.abs(whatIfTransaction.amount))})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.whatIfClose}
              onPress={() => setWhatIfTransaction(null)}
            >
              <Icon name="close-circle" size={20} color={brandColors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* PRIMARY ACCOUNT CARD */}
        <View style={styles.section}>
          <View style={styles.primaryCard}>
            {/* Account Selector Dropdown */}
            <TouchableOpacity
              style={styles.accountSelector}
              onPress={() => setShowAccountPicker(true)}
            >
              <View style={styles.accountSelectorLeft}>
                <View style={[styles.accountIcon, { backgroundColor: brandColors.tealPrimary + '15' }]}>
                  <Icon name={accountIcons[selectedAccount.type as keyof typeof accountIcons] || 'wallet'} size={22} color={brandColors.tealPrimary} />
                </View>
                <View>
                  <Text style={styles.accountSelectorLabel}>Primary Account</Text>
                  <Text style={styles.accountSelectorName}>{selectedAccount.name}</Text>
                </View>
              </View>
              <Icon name="chevron-down" size={20} color={brandColors.textGray} />
            </TouchableOpacity>

            {/* Available to Spend - Hero */}
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>AVAILABLE TO SPEND</Text>
              <Text style={styles.heroAmount}>{formatCurrency(selectedAccount.availableToSpend)}</Text>
            </View>

            {/* Test a Purchase Card */}
            <TouchableOpacity
              style={styles.testPurchaseCard}
              onPress={() => setShowWhatIf(true)}
              activeOpacity={0.7}
            >
              <View style={styles.testPurchaseIcon}>
                <Icon name="calculator" size={24} color={brandColors.tealPrimary} />
              </View>
              <View style={styles.testPurchaseContent}>
                <Text style={styles.testPurchaseTitle}>Can I afford a purchase?</Text>
                <Text style={styles.testPurchaseSubtitle}>
                  Test how spending money today will impact your finances
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={brandColors.textGray} />
            </TouchableOpacity>

            {/* Financial Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>How we calculated this</Text>
              <View style={styles.breakdownRows}>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: brandColors.tealPrimary }]} />
                    <Text style={styles.breakdownLabel}>Current Balance</Text>
                  </View>
                  <Text style={styles.breakdownValue}>{formatCurrency(selectedAccount.currentBalance)}</Text>
                </View>
                {totalUpcomingIncome > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.breakdownDot, { backgroundColor: brandColors.success }]} />
                      <Text style={styles.breakdownLabel}>Upcoming Income</Text>
                    </View>
                    <Text style={[styles.breakdownValue, styles.breakdownPositive]}>+{formatCurrency(totalUpcomingIncome)}</Text>
                  </View>
                )}
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: brandColors.error }]} />
                    <Text style={styles.breakdownLabel}>Upcoming Bills</Text>
                  </View>
                  <Text style={[styles.breakdownValue, styles.breakdownNegative]}>-{formatCurrency(totalUpcomingBills)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: brandColors.orangeAccent }]} />
                    <Text style={styles.breakdownLabel}>Safety Cushion</Text>
                  </View>
                  <Text style={[styles.breakdownValue, styles.breakdownNegative]}>-{formatCurrency(selectedAccount.cushion)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.breakdownLabel}>Goal Allocations</Text>
                  </View>
                  <Text style={[styles.breakdownValue, styles.breakdownNegative]}>-{formatCurrency(selectedAccount.goalAllocations)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotal}>Available to Spend</Text>
                  <Text style={styles.breakdownTotalValue}>{formatCurrency(selectedAccount.availableToSpend)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK STATS ROW */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Icon
                name="chart-line-variant"
                size={20}
                color={projection60DayLow < selectedAccount.availableToSpend ? brandColors.error : brandColors.success}
              />
              <Text style={styles.statLabel}>60-Day Low</Text>
              <Text style={[
                styles.statValue,
                { color: projection60DayLow < 0 ? brandColors.error : brandColors.textDark }
              ]}>
                {formatCurrency(projection60DayLow)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="shield-check" size={20} color={brandColors.success} />
              <Text style={styles.statLabel}>Protection</Text>
              <Text style={styles.statValue}>{protectionDays === 60 ? '60+' : protectionDays} days</Text>
            </View>
          </View>
        </View>

        {/* UPCOMING BILLS */}
        {upcomingBills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Bills</Text>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Transactions')}>
                <Text style={styles.seeAllLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.billsContainer}>
              {upcomingBills.map((bill, index) => {
                const categoryIcon = getCategoryIcon(bill.category, bill.type);
                return (
                  <View key={index} style={styles.billCard}>
                    <View style={styles.billLeft}>
                      <View style={[styles.billIconContainer, { backgroundColor: categoryIcon.color + '10' }]}>
                        <Icon name={categoryIcon.icon} size={20} color={categoryIcon.color} />
                      </View>
                      <View style={styles.billInfo}>
                        <Text style={styles.billName}>{bill.name}</Text>
                        <Text style={styles.billDate}>Due {bill.date} • {bill.daysAway} days</Text>
                      </View>
                    </View>
                    <View style={styles.billRight}>
                      <Text style={styles.billAmount}>-{formatCurrency(bill.amount)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* EXPANDABLE FAB MENU */}
      {fabExpanded && (
        <>
          <TouchableOpacity
            style={styles.fabBackdrop}
            onPress={() => setFabExpanded(false)}
            activeOpacity={1}
          />
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setFabExpanded(false);
                setShowAddTransaction(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="cash-plus" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>Add Transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={handleAddAccountWithPlaid}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="bank-plus" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>Connect Bank</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                console.log('🔵 Manual Account button pressed');
                setFabExpanded(false);
                setShowManageAccount(true);
                console.log('🔵 showManageAccount set to true');
              }}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="bank" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>Manual Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setFabExpanded(false);
                setShowTransfer(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="bank-transfer" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>Transfer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              onPress={() => {
                setFabExpanded(false);
                setShowWhatIf(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="lightbulb-on" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>What If?</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* MAIN FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabExpanded(!fabExpanded)}
      >
        <Icon
          name={fabExpanded ? 'close' : 'plus'}
          size={28}
          color={brandColors.white}
        />
      </TouchableOpacity>

      {/* ACCOUNT PICKER MODAL */}
      <Modal
        visible={showAccountPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Primary Account</Text>
              <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                <Icon name="close" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
            </View>
            {accounts.map((account) => (
              <View
                key={account.id}
                style={[
                  styles.accountOption,
                  account.id === selectedAccountId && styles.accountOptionActive
                ]}
              >
                <TouchableOpacity
                  style={styles.accountOptionMain}
                  onPress={() => {
                    setSelectedAccountId(account.id);
                    setShowAccountPicker(false);
                  }}
                >
                  <View style={styles.accountOptionLeft}>
                    <View style={[styles.accountOptionIcon, { backgroundColor: brandColors.tealPrimary + '15' }]}>
                      <Icon name={accountIcons[account.type as keyof typeof accountIcons] || 'wallet'} size={24} color={brandColors.tealPrimary} />
                    </View>
                    <View>
                      <Text style={styles.accountOptionName}>{account.name}</Text>
                      <Text style={styles.accountOptionType}>{account.type}</Text>
                    </View>
                  </View>
                  <View style={styles.accountOptionRight}>
                    <Text style={styles.accountOptionLabel}>Available</Text>
                    <Text style={styles.accountOptionAmount}>{formatCurrency(account.availableToSpend)}</Text>
                  </View>
                  {account.id === selectedAccountId && (
                    <View style={styles.accountOptionCheck}>
                      <Icon name="check-circle" size={24} color={brandColors.orangeAccent} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Star icon to set as primary */}
                <TouchableOpacity
                  style={styles.primaryStarButton}
                  onPress={() => handleTogglePrimaryAccount(account.id)}
                >
                  <Icon
                    name={account.isPrimary ? "star" : "star-outline"}
                    size={24}
                    color={account.isPrimary ? brandColors.orangeAccent : brandColors.textGray}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WHAT IF MODAL */}
      <WhatIfModal
        visible={showWhatIf}
        onClose={() => setShowWhatIf(false)}
        onSimulate={handleWhatIfSimulate}
        currentAvailableToSpend={selectedAccount?.availableToSpend || 0}
        projection60DayLow={projection60DayLow}
        protectionDays={protectionDays}
      />

      {/* ADD TRANSACTION MODAL */}
      <AddTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />

      {/* MANAGE ACCOUNT MODAL */}
      {console.log('🔵 Rendering ManageAccountModal, visible:', showManageAccount)}
      <ManageAccountModal
        visible={showManageAccount}
        onClose={() => setShowManageAccount(false)}
        onSuccess={() => {
          console.log('Account saved successfully!');
        }}
        account={null}
      />

      {/* TRANSFER MODAL */}
      <TransferModal
        visible={showTransfer}
        onClose={() => setShowTransfer(false)}
        onSuccess={() => {
          console.log('Transfer completed successfully!');
        }}
      />

      {/* PLAID ACCOUNT PICKER */}
      {plaidData && (
        <PlaidAccountPicker
          visible={showPlaidPicker}
          institutionName={plaidData.institutionName}
          plaidAccounts={plaidData.plaidAccounts}
          onSelect={handlePlaidAccountsSelected}
          onCancel={() => {
            setShowPlaidPicker(false);
            setPlaidData(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCard: {
    backgroundColor: brandColors.white,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: brandColors.tealPrimary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtext: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brandColors.orangeAccent,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: brandColors.orangeAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
  },
  emptyButtonSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brandColors.border,
  },
  emptyButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
  },

  // Header
  header: {
    backgroundColor: brandColors.white,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
    marginRight: 4,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brandColors.orangeAccent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  profileButton: {
    padding: 2,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: brandColors.orangeAccent,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.tealPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brandColors.orangeAccent,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
  },

  // Guest Mode Banner
  guestBanner: {
    backgroundColor: brandColors.orangeAccent + '15',
    borderWidth: 1,
    borderColor: brandColors.orangeAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  guestBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  guestBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    flex: 1,
  },
  guestBannerButton: {
    backgroundColor: brandColors.orangeAccent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  guestBannerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.white,
  },

  // What If Banner
  whatIfBanner: {
    backgroundColor: brandColors.orangeAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  whatIfContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  whatIfText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.white,
    flex: 1,
  },
  whatIfClose: {
    padding: 4,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Primary Card
  primaryCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  accountSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
    marginBottom: 20,
  },
  accountSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 4,
  },
  accountSelectorName: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textGray,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 52,
    fontWeight: '800',
    color: brandColors.tealPrimary,
    letterSpacing: -2,
    marginBottom: 10,
  },

  // Test Purchase Card
  testPurchaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.tealPrimary + '08',
    borderWidth: 1,
    borderColor: brandColors.tealPrimary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  testPurchaseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.tealPrimary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPurchaseContent: {
    flex: 1,
    gap: 2,
  },
  testPurchaseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  testPurchaseSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 16,
  },

  // Breakdown Section
  breakdownSection: {
    backgroundColor: brandColors.backgroundOffWhite,
    padding: 14,
    borderRadius: 12,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textGray,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRows: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  breakdownNegative: {
    color: brandColors.textGray,
  },
  breakdownPositive: {
    color: brandColors.success,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: brandColors.border,
    marginVertical: 6,
  },
  breakdownTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: brandColors.tealPrimary,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
    marginTop: 8,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
  },

  // Bills
  billsContainer: {
    gap: 10,
  },
  billCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  billIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  billDate: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.error,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brandColors.orangeAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fabMenu: {
    position: 'absolute',
    right: 20,
    bottom: 104,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabMenuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brandColors.tealPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.white,
    backgroundColor: brandColors.tealPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: brandColors.backgroundOffWhite,
    position: 'relative',
    overflow: 'hidden',
  },
  accountOptionActive: {
    backgroundColor: brandColors.tealPrimary + '10',
    borderWidth: 2,
    borderColor: brandColors.orangeAccent,
  },
  accountOptionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    flex: 1,
  },
  accountOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  primaryStarButton: {
    padding: 16,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountOptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  accountOptionType: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    textTransform: 'capitalize',
  },
  accountOptionRight: {
    alignItems: 'flex-end',
    marginRight: 32,
  },
  accountOptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 4,
  },
  accountOptionAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },
  accountOptionCheck: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
  },
});
