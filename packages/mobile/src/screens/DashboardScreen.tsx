// packages/mobile/src/screens/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';
import { AddTransactionModal } from '../components/AddTransactionModal';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
};

type Account = {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  cushion: number;
  availableToSpend: number;
};

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
  isRecurring: boolean;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
};

export const DashboardScreen = () => {
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  // Fetch accounts and transactions from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribeAccounts = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot((snapshot) => {
        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const availableToSpend = (data.currentBalance || 0) - (data.cushion || 0);
          return {
            id: doc.id,
            name: data.name || 'Unnamed Account',
            type: data.type || 'checking',
            currentBalance: data.currentBalance || 0,
            cushion: data.cushion || 0,
            availableToSpend,
          };
        });
        setAccounts(accountsData);
        setLoading(false);
      });

    const unsubscribeTransactions = firestore()
      .collection(`users/${user.uid}/transactions`)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot((snapshot) => {
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Transaction));
        setTransactions(transactionsData);
      });

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log('User signed out successfully');
      // Navigation will happen automatically once user state changes
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Calculate 60-day outlook
  const calculate60DayOutlook = () => {
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    console.log('Dashboard - Calculating outlook with:', {
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      currentBalance
    });

    if (transactions.length === 0 || accounts.length === 0) {
      return {
        currentBalance,
        projectedLow: currentBalance,
        projectedHigh: currentBalance,
      };
    }

    // Simple projection: calculate based on recurring transactions over 60 days
    const recurringTransactions = transactions.filter(t => t.isRecurring);

    console.log('Dashboard - Recurring transactions:', recurringTransactions.length);

    if (recurringTransactions.length === 0) {
      return {
        currentBalance,
        projectedLow: currentBalance,
        projectedHigh: currentBalance,
      };
    }

    let projectedLow = currentBalance;
    let projectedHigh = currentBalance;
    let runningBalance = currentBalance;

    // Calculate monthly income and expenses
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    recurringTransactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      let monthlyAmount = 0;

      // Convert to monthly based on frequency
      switch (transaction.frequency) {
        case 'weekly':
          monthlyAmount = amount * 4.33; // ~4.33 weeks per month
          break;
        case 'biweekly':
          monthlyAmount = amount * 2.17; // ~2.17 biweeks per month
          break;
        case 'monthly':
        default:
          monthlyAmount = amount;
          break;
      }

      if (transaction.type === 'income') {
        monthlyIncome += monthlyAmount;
      } else {
        monthlyExpenses += monthlyAmount;
      }
    });

    const monthlyNet = monthlyIncome - monthlyExpenses;
    const dailyNet = monthlyNet / 30;

    // Project for 60 days
    for (let day = 1; day <= 60; day++) {
      runningBalance += dailyNet;

      if (runningBalance < projectedLow) projectedLow = runningBalance;
      if (runningBalance > projectedHigh) projectedHigh = runningBalance;
    }

    console.log('Dashboard - Outlook calculated:', { currentBalance, projectedLow, projectedHigh });

    return {
      currentBalance,
      projectedLow,
      projectedHigh,
    };
  };

  const outlook = calculate60DayOutlook();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={brandColors.primaryBlue} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finch</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Your Dashboard</Text>
        <Text style={styles.welcomeSubtext}>
          {user?.isAnonymous ? 'Guest Mode' : 'Manage your finances with ease'}
        </Text>
      </View>

      {/* Guest Mode Upgrade Prompt - Moved to top */}
      {user?.isAnonymous && (
        <View style={styles.upgradeContainer}>
          <Text style={styles.upgradeTitle}>Save Your Data</Text>
          <Text style={styles.upgradeDescription}>
            You're in guest mode. Create an account to save your data permanently.
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => Alert.alert('Coming Soon', 'Account upgrade will be added soon!')}
          >
            <Text style={styles.upgradeButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 60-Day Outlook */}
      <View style={styles.outlookCard}>
        <Text style={styles.outlookTitle}>60-Day Outlook</Text>
        <Text style={styles.outlookSubtitle}>Aggregated across all accounts</Text>
        <View style={styles.outlookStats}>
          <View style={styles.outlookStat}>
            <Text style={styles.outlookLabel}>Current Balance</Text>
            <Text style={styles.outlookValue}>{formatCurrency(outlook.currentBalance)}</Text>
          </View>
          <View style={styles.outlookStat}>
            <Text style={styles.outlookLabel}>Projected Low</Text>
            <Text style={[styles.outlookValue, outlook.projectedLow < 0 && styles.negativeAmount]}>
              {formatCurrency(outlook.projectedLow)}
            </Text>
          </View>
          <View style={styles.outlookStat}>
            <Text style={styles.outlookLabel}>Projected High</Text>
            <Text style={[styles.outlookValue, styles.positiveAmount]}>
              {formatCurrency(outlook.projectedHigh)}
            </Text>
          </View>
        </View>
      </View>

      {/* Accounts */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          {accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.accountBalances}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Balance</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(account.currentBalance)}</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Available</Text>
                  <Text style={[styles.balanceValue, account.availableToSpend < 0 && styles.negativeAmount]}>
                    {formatCurrency(account.availableToSpend)}
                  </Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Cushion</Text>
                  <Text style={styles.balanceValue}>{formatCurrency(account.cushion)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Activity */}
      {transactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionName}>{transaction.name}</Text>
                {transaction.category && (
                  <Text style={styles.transactionCategory}>{transaction.category}</Text>
                )}
              </View>
              <Text style={[
                styles.transactionAmount,
                transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {accounts.length === 0 && transactions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No data yet</Text>
          <Text style={styles.emptyStateText}>
            Complete the setup wizard to add accounts and transactions
          </Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddTransaction(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSuccess={() => {
          console.log('Transaction added successfully!');
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: brandColors.textGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.primaryBlue,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: brandColors.primaryBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: brandColors.textGray,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  statLabel: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  negativeAmount: {
    color: brandColors.red,
  },
  positiveAmount: {
    color: brandColors.green,
  },
  outlookCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  outlookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  outlookSubtitle: {
    fontSize: 12,
    color: brandColors.textGray,
    marginBottom: 20,
  },
  outlookStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outlookStat: {
    flex: 1,
    alignItems: 'center',
  },
  outlookLabel: {
    fontSize: 12,
    color: brandColors.textGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  outlookValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    marginBottom: 12,
  },
  accountHeader: {
    marginBottom: 16,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  accountBalances: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: brandColors.textGray,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    marginBottom: 8,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: brandColors.textGray,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  incomeAmount: {
    color: brandColors.green,
  },
  expenseAmount: {
    color: brandColors.red,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: brandColors.textGray,
    textAlign: 'center',
  },
  upgradeContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    backgroundColor: brandColors.primaryBlue,
    borderRadius: 12,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.white,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 14,
    color: brandColors.white,
    marginBottom: 16,
    opacity: 0.9,
  },
  upgradeButton: {
    backgroundColor: brandColors.white,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: brandColors.primaryBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 32,
    color: brandColors.white,
    fontWeight: '300',
  },
});
