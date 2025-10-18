import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
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
  accountId?: string;
};

type Account = {
  id: string;
  name: string;
};

export const TransactionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch accounts
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            setAccounts([]);
            return;
          }

          const accts = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || 'Unnamed Account',
          })) as Account[];
          setAccounts(accts);
        },
        (error) => {
          console.error('Error fetching accounts:', error);
          setAccounts([]);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Fetch ALL transactions from Firestore (like web app does)
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Fetch all transactions without complex queries (to avoid index requirements)
    const query = firestore().collection(`users/${user.uid}/transactions`);

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        if (!snapshot) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        const txns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        console.log('TransactionsScreen - Fetched transactions:', txns.length);
        console.log('TransactionsScreen - Raw transactions:', JSON.stringify(txns, null, 2));
        setTransactions(txns);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Generate instances from recurring transactions (includes one-time transactions + instances)
  const allInstances = useMemo(() => {
    console.log('TransactionsScreen - Generating instances from', transactions.length, 'transactions');
    const instances = generateTransactionInstances(transactions, 365); // 12 months
    console.log('TransactionsScreen - Generated', instances.length, 'instances');
    console.log('TransactionsScreen - Instances:', JSON.stringify(instances.slice(0, 5), null, 2));
    return instances;
  }, [transactions]);

  // Filter transactions based on active tab (like web app does - in memory)
  const filteredTransactions = useMemo(() => {
    // For recurring tab, show the series (not instances)
    const dataSource = activeTab === 'recurring' ? transactions : allInstances;

    const filtered = dataSource.filter((txn) => {
      const transactionName = txn.description || txn.name || '';
      const matchesSearch = transactionName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = selectedAccountId === 'all' || txn.accountId === selectedAccountId;

      // Filter by tab
      if (activeTab === 'recurring') {
        // Show only series (isRecurring = true, no isInstance flag)
        const matches = txn.isRecurring && !txn.isInstance && matchesSearch && matchesAccount;
        if (selectedAccountId !== 'all' && txn.isRecurring && !txn.isInstance) {
          console.log('Recurring filter check:', {
            name: txn.description || txn.name,
            type: txn.type,
            accountId: txn.accountId,
            selectedAccountId,
            matchesAccount,
            finalMatch: matches
          });
        }
        return matches;
      } else if (activeTab === 'upcoming') {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const txnDate = txn.date instanceof Date ? txn.date : (txn.date?.toDate ? txn.date.toDate() : new Date(txn.date));
        return txnDate >= now && matchesSearch && matchesAccount;
      } else {
        // History
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const txnDate = txn.date instanceof Date ? txn.date : (txn.date?.toDate ? txn.date.toDate() : new Date(txn.date));
        return txnDate < now && matchesSearch && matchesAccount;
      }
    }).sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : (a.date?.toDate ? a.date.toDate() : new Date(a.date));
      const dateB = b.date instanceof Date ? b.date : (b.date?.toDate ? b.date.toDate() : new Date(b.date));
      return activeTab === 'history'
        ? dateB.getTime() - dateA.getTime()  // Descending for history
        : dateA.getTime() - dateB.getTime(); // Ascending for others
    });

    console.log(`TransactionsScreen - ${activeTab} tab: ${filtered.length} filtered from ${dataSource.length} total`);
    return filtered;
  }, [transactions, allInstances, activeTab, searchQuery, selectedAccountId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const renderTransaction = (txn: Transaction) => {
    const displayName = txn.description || txn.name || 'Unnamed Transaction';
    const displayAmount = Math.abs(txn.amount || 0);
    const frequency = txn.recurringDetails?.frequency || txn.frequency;

    return (
      <TouchableOpacity key={txn.instanceId || txn.id} style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionName}>{displayName}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(txn.date)}
            {txn.isRecurring && frequency && ` • ${frequency}`}
          </Text>
          {txn.category && <Text style={styles.transactionCategory}>{txn.category}</Text>}
        </View>
        <Text
          style={[
            styles.transactionAmount,
            txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
          ]}
        >
          {txn.type === 'income' ? '+' : '-'}${displayAmount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recurring' && styles.activeTab]}
          onPress={() => setActiveTab('recurring')}
        >
          <Text style={[styles.tabText, activeTab === 'recurring' && styles.activeTabText]}>
            Recurring
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search and Account Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={brandColors.textGray}
        />

        {/* Account Filter */}
        <View style={styles.accountFilterContainer}>
          <Text style={styles.filterLabel}>Account:</Text>
          <View style={styles.scrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.accountScroll}
              contentContainerStyle={styles.scrollContent}
            >
              <TouchableOpacity
                style={[styles.accountChip, selectedAccountId === 'all' && styles.accountChipActive]}
                onPress={() => setSelectedAccountId('all')}
              >
                <Text style={[styles.accountChipText, selectedAccountId === 'all' && styles.accountChipTextActive]}>
                  All Accounts
                </Text>
              </TouchableOpacity>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountChip, selectedAccountId === account.id && styles.accountChipActive]}
                  onPress={() => setSelectedAccountId(account.id)}
                >
                  <Text style={[styles.accountChipText, selectedAccountId === account.id && styles.accountChipTextActive]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColors.primaryBlue} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions found</Text>
            </View>
          ) : (
            filteredTransactions.map(renderTransaction)
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: brandColors.primaryBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  activeTabText: {
    color: brandColors.primaryBlue,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  searchInput: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    marginBottom: 12,
  },
  accountFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginRight: 12,
    minWidth: 70,
  },
  scrollWrapper: {
    flex: 1,
  },
  accountScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brandColors.backgroundOffWhite,
    marginRight: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  accountChipActive: {
    backgroundColor: brandColors.primaryBlue,
    borderColor: brandColors.primaryBlue,
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  accountChipTextActive: {
    color: brandColors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: brandColors.primaryBlue,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  incomeAmount: {
    color: brandColors.green,
  },
  expenseAmount: {
    color: brandColors.red,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: brandColors.textGray,
  },
});
