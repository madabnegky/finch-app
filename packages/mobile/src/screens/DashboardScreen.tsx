// packages/mobile/src/screens/DashboardScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { ManageAccountModal } from '../components/ManageAccountModal';
import { TransferModal } from '../components/TransferModal';
import { WhatIfModal } from '../components/WhatIfModal';
import { generateTransactionInstances } from '../utils/transactionInstances';
import brandColors from '../theme/colors';

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
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [whatIfTransaction, setWhatIfTransaction] = useState<any>(null);

  // Fetch accounts and transactions from Firebase
  useEffect(() => {
    if (!user) return;

    const unsubscribeAccounts = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot(async (snapshot) => {
        // Fetch all goals to calculate total allocations per account
        const goalsSnapshot = await firestore()
          .collection(`users/${user.uid}/goals`)
          .get();

        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();

          // Calculate total allocated to goals for this account
          const totalAllocatedToGoals = goalsSnapshot.docs
            .filter(goalDoc => goalDoc.data().accountId === doc.id)
            .reduce((sum, goalDoc) => sum + (goalDoc.data().allocatedAmount || 0), 0);

          // availableToSpend = currentBalance - cushion - goalAllocations
          const availableToSpend = (data.currentBalance || 0) - (data.cushion || 0) - totalAllocatedToGoals;

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

  const handleDeleteAccount = async () => {
    if (!user || !accountToDelete) return;

    setDeleting(true);
    try {
      await firestore()
        .collection(`users/${user.uid}/accounts`)
        .doc(accountToDelete.id)
        .delete();

      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      Alert.alert('Success', 'Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Generate all transaction instances for 60 days
  const allInstances = useMemo(() => {
    const instances = generateTransactionInstances(transactions, 60);

    // Add what-if transaction if present
    if (whatIfTransaction) {
      instances.push(whatIfTransaction);
    }

    return instances;
  }, [transactions, whatIfTransaction]);

  // Calculate projected balances per account
  const accountsWithProjections = useMemo(() => {
    if (accounts.length === 0) return accounts;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 60);

    return accounts.map(account => {
      // Calculate actual current balance by including past transactions
      const pastInstances = allInstances.filter(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        instDate.setHours(0, 0, 0, 0);
        return inst.accountId === account.id && instDate < today;
      });

      const actualCurrentBalance = account.currentBalance + pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

      // Get all future instances for this account
      const accountInstances = allInstances.filter(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        instDate.setHours(0, 0, 0, 0);
        return inst.accountId === account.id && instDate >= today && instDate <= endDate;
      });

      if (accountInstances.length === 0) {
        return {
          ...account,
          currentBalance: actualCurrentBalance,
          projectedBalance: actualCurrentBalance,
          availableToSpend: actualCurrentBalance - account.cushion,
        };
      }

      // Calculate lowest projected balance for this account
      let runningBalance = actualCurrentBalance;
      let lowestBalance = actualCurrentBalance;

      // Group by date
      const instancesByDate = new Map<string, typeof allInstances>();
      accountInstances.forEach(inst => {
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

        if (runningBalance < lowestBalance) lowestBalance = runningBalance;
      }

      return {
        ...account,
        currentBalance: actualCurrentBalance,
        projectedBalance: lowestBalance,
        availableToSpend: lowestBalance - account.cushion,
      };
    });
  }, [accounts, allInstances]);

  // Calculate 60-day outlook using generated instances
  const outlook = useMemo(() => {
    // Use the actual current balances from accountsWithProjections
    const currentBalance = accountsWithProjections.reduce((sum, acc) => sum + acc.currentBalance, 0);

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

    // Filter to future instances only (including today)
    const futureInstances = allInstances.filter(inst => {
      const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
      instDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

      // Include transactions from today onwards
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
  }, [accountsWithProjections, allInstances]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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

      {/* Simulation Banner */}
      {whatIfTransaction && (() => {
        // Check if simulation causes any issues (show only the most critical one)
        const affectedAccount = accountsWithProjections.find(acc => acc.id === whatIfTransaction.accountId);
        const negativeBalance = affectedAccount && affectedAccount.projectedBalance < 0;
        const noAvailableFunds = affectedAccount && affectedAccount.availableToSpend <= 0;

        // Prioritize: 1) Negative balance, 2) No available funds
        let warningMessage = null;
        if (negativeBalance) {
          warningMessage = "⚠️ This would make your account balance negative";
        } else if (noAvailableFunds) {
          warningMessage = "⚠️ This would reduce available funds to $0 or below";
        }

        return (
          <View style={[styles.simulationBanner, warningMessage && styles.simulationBannerWarning]}>
            <View style={styles.simulationBannerContent}>
              <Icon
                name={warningMessage ? "alert" : "information"}
                size={20}
                color={brandColors.white}
              />
              <View style={styles.simulationBannerText}>
                <Text style={styles.simulationBannerTitle}>
                  {warningMessage ? "Warning: Financial Issue Detected" : "Simulation Mode Active"}
                </Text>
                <Text style={styles.simulationBannerDescription}>
                  Testing: {whatIfTransaction.description} ({formatCurrency(Math.abs(whatIfTransaction.amount))})
                </Text>
                {warningMessage && (
                  <Text style={styles.simulationWarningText}>
                    {warningMessage}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.clearSimulationButton}
              onPress={() => setWhatIfTransaction(null)}
            >
              <Text style={styles.clearSimulationButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Accounts */}
      {accountsWithProjections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          {accountsWithProjections.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </Text>
                </View>
                <View style={styles.accountActions}>
                  <TouchableOpacity
                    style={styles.accountActionButton}
                    onPress={() => {
                      setSelectedAccount(account);
                      setShowManageAccount(true);
                    }}
                  >
                    <Icon name="pencil" size={18} color={brandColors.tealPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.accountActionButton}
                    onPress={() => {
                      setAccountToDelete(account);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Icon name="delete" size={18} color={brandColors.red} />
                  </TouchableOpacity>
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
      {accounts.length === 0 && transactions.length === 0 && (
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
        onSimulate={(transaction) => {
          setWhatIfTransaction(transaction);
        }}
      />

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.deleteModalContent}>
              <Icon name="alert-circle" size={48} color={brandColors.red} />
              <Text style={styles.deleteModalTitle}>Delete Account?</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete "{accountToDelete.name}"? This action cannot be undone.
              </Text>
              <Text style={styles.deleteModalWarning}>
                Note: Transactions linked to this account will remain but won't be associated with any account.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.cancelButton]}
                  onPress={() => {
                    setAccountToDelete(null);
                    setShowDeleteConfirm(false);
                  }}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalButton, styles.deleteButton]}
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={brandColors.white} />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Expandable FAB */}
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
              onPress={() => {
                setFabExpanded(false);
                setShowManageAccount(true);
              }}
            >
              <View style={styles.fabMenuButton}>
                <Icon name="bank-plus" size={24} color={brandColors.white} />
              </View>
              <Text style={styles.fabMenuLabel}>Add Account</Text>
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

      {/* Main FAB */}
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
    backgroundColor: brandColors.tealPrimary,
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
    color: brandColors.tealPrimary,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  signOutText: {
    color: brandColors.tealPrimary,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: brandColors.tealPrimary,
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
    color: brandColors.tealPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.tealPrimary,
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
    bottom: 90,
    gap: 16,
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fabMenuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
    backgroundColor: brandColors.tealPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  accountActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
  },
  deleteModalContent: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: brandColors.textDark,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 20,
    backgroundColor: brandColors.amber + '15',
    padding: 12,
    borderRadius: 8,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: brandColors.lightGray,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  deleteButton: {
    backgroundColor: brandColors.red,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
  simulationBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: brandColors.purple,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  simulationBannerWarning: {
    backgroundColor: brandColors.amber,
  },
  simulationBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  simulationBannerText: {
    flex: 1,
  },
  simulationBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.white,
    marginBottom: 4,
  },
  simulationBannerDescription: {
    fontSize: 12,
    color: brandColors.white,
    opacity: 0.9,
  },
  clearSimulationButton: {
    backgroundColor: brandColors.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  clearSimulationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.purple,
  },
  simulationWarningText: {
    fontSize: 12,
    color: brandColors.white,
    fontWeight: '600',
    marginTop: 4,
  },
});
