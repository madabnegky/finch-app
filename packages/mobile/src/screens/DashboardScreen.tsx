// packages/mobile/src/screens/DashboardScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { AddGoalModal } from '../components/AddGoalModal';
import { ManageAccountModal } from '../components/ManageAccountModal';
import { TransferModal } from '../components/TransferModal';
import { WhatIfModal } from '../components/WhatIfModal';
import { generateTransactionInstances } from '../utils/transactionInstances';

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

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
};

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

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

    // Fetch ALL transactions (for accurate instance generation)
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

  // Generate all transaction instances for 60 days
  const allInstances = useMemo(() => {
    return generateTransactionInstances(transactions, 60);
  }, [transactions]);

  // Calculate 60-day outlook using generated instances
  const outlook = useMemo(() => {
    const currentBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    if (allInstances.length === 0 || accounts.length === 0) {
      return {
        currentBalance,
        projectedLow: currentBalance,
        projectedHigh: currentBalance,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 60);

    // Filter to future instances only
    const futureInstances = allInstances.filter(inst => {
      const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
      return instDate >= today && instDate <= endDate;
    });

    let projectedLow = currentBalance;
    let projectedHigh = currentBalance;
    let runningBalance = currentBalance;

    // Group instances by date
    const instancesByDate = new Map<string, typeof allInstances>();
    futureInstances.forEach(inst => {
      const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
      const dateKey = instDate.toISOString().split('T')[0];
      if (!instancesByDate.has(dateKey)) {
        instancesByDate.set(dateKey, []);
      }
      instancesByDate.get(dateKey)!.push(inst);
    });

    // Project day by day
    for (let day = 0; day <= 60; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      const dateKey = date.toISOString().split('T')[0];

      const dayInstances = instancesByDate.get(dateKey) || [];
      const dailyNet = dayInstances.reduce((sum, inst) => sum + inst.amount, 0);
      runningBalance += dailyNet;

      if (runningBalance < projectedLow) projectedLow = runningBalance;
      if (runningBalance > projectedHigh) projectedHigh = runningBalance;
    }

    return {
      currentBalance,
      projectedLow,
      projectedHigh,
    };
  }, [accounts, allInstances]);

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
      {/* Navigation Buttons */}
      <View style={styles.navContainer}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Transactions' as never)}>
          <Text style={styles.navButtonText}>💳 Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Calendar' as never)}>
          <Text style={styles.navButtonText}>📅 Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Reports' as never)}>
          <Text style={styles.navButtonText}>📊 Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Budget' as never)}>
          <Text style={styles.navButtonText}>💰 Budget</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Settings' as never)}>
          <Text style={styles.navButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome to Finch</Text>
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

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowAddTransaction(true)}
          >
            <Text style={styles.actionButtonIcon}>💵</Text>
            <Text style={styles.actionButtonText}>Add Transaction</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowManageAccount(true)}
          >
            <Text style={styles.actionButtonIcon}>🏦</Text>
            <Text style={styles.actionButtonText}>Add Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowTransfer(true)}
          >
            <Text style={styles.actionButtonIcon}>💸</Text>
            <Text style={styles.actionButtonText}>Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowWhatIf(true)}
          >
            <Text style={styles.actionButtonIcon}>🤔</Text>
            <Text style={styles.actionButtonText}>What If?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Goals & Envelopes */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Goals & Envelopes</Text>
            <TouchableOpacity onPress={() => setShowAddGoal(true)}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalAmount}>
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: progress >= 100 ? brandColors.green : brandColors.primaryBlue
                      }
                    ]}
                  />
                </View>
                <Text style={styles.goalProgress}>{progress.toFixed(0)}% complete</Text>
              </View>
            );
          })}
        </View>
      )}

      {goals.length === 0 && (
        <View style={styles.section}>
          <View style={styles.emptyGoalsCard}>
            <Text style={styles.emptyGoalsTitle}>Set Financial Goals</Text>
            <Text style={styles.emptyGoalsText}>
              Create goals to track your savings progress
            </Text>
            <TouchableOpacity
              style={styles.emptyGoalsButton}
              onPress={() => setShowAddGoal(true)}
            >
              <Text style={styles.emptyGoalsButtonText}>+ Add Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
          {transactions.slice(0, 10).map((transaction) => {
            const txnDate = transaction.date instanceof Date
              ? transaction.date
              : (transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date));
            return (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionName}>{transaction.description || transaction.name || 'Unnamed'}</Text>
                  <View style={styles.transactionMeta}>
                    {transaction.category && (
                      <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    )}
                    <Text style={styles.transactionDate}>
                      {txnDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                ]}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {accounts.length === 0 && transactions.length === 0 && goals.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No data yet</Text>
          <Text style={styles.emptyStateText}>
            Use the quick actions above to get started
          </Text>
        </View>
      )}

      {/* Modals */}
      <AddTransactionModal
        visible={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSuccess={() => {
          console.log('Transaction added successfully!');
        }}
      />

      <AddGoalModal
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSuccess={() => {
          console.log('Goal added successfully!');
        }}
      />

      <ManageAccountModal
        visible={showManageAccount}
        onClose={() => {
          setShowManageAccount(false);
          setSelectedAccount(null);
        }}
        onSuccess={() => {
          console.log('Account saved successfully!');
        }}
        account={selectedAccount}
      />

      <TransferModal
        visible={showTransfer}
        onClose={() => setShowTransfer(false)}
        onSuccess={() => {
          console.log('Transfer completed successfully!');
        }}
      />

      <WhatIfModal
        visible={showWhatIf}
        onClose={() => setShowWhatIf(false)}
        currentBalance={outlook.currentBalance}
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
  navContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  navButton: {
    backgroundColor: brandColors.primaryBlue,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: '48%',
    alignItems: 'center',
  },
  navButtonText: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '600',
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
  transactionMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  transactionCategory: {
    fontSize: 12,
    color: brandColors.textGray,
  },
  transactionDate: {
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    alignItems: 'center',
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 32,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.primaryBlue,
  },
  goalCard: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    flex: 1,
  },
  goalAmount: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgress: {
    fontSize: 12,
    color: brandColors.textGray,
    textAlign: 'right',
  },
  emptyGoalsCard: {
    backgroundColor: brandColors.white,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    alignItems: 'center',
  },
  emptyGoalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  emptyGoalsText: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyGoalsButton: {
    backgroundColor: brandColors.primaryBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyGoalsButtonText: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
