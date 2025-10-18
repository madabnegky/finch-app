import React, { useState, useEffect } from 'react';
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
};

export const TransactionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    let query = firestore().collection(`users/${user.uid}/transactions`);

    // Filter based on active tab
    if (activeTab === 'recurring') {
      query = query.where('isRecurring', '==', true) as any;
    } else if (activeTab === 'upcoming') {
      // Show future dated or recent transactions
      const now = new Date();
      now.setDate(now.getDate() - 7); // Include last 7 days
      query = query.where('date', '>=', firestore.Timestamp.fromDate(now)) as any;
    } else {
      // History - show past transactions
      const now = new Date();
      query = query.where('date', '<', firestore.Timestamp.now()) as any;
    }

    query = query.orderBy('date', activeTab === 'history' ? 'desc' : 'asc') as any;

    const unsubscribe = query.onSnapshot((snapshot) => {
      const txns = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];

      setTransactions(txns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeTab]);

  const filteredTransactions = transactions.filter((txn) =>
    txn.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderTransaction = (txn: Transaction) => (
    <TouchableOpacity key={txn.id} style={styles.transactionCard}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionName}>{txn.name}</Text>
        <Text style={styles.transactionDate}>
          {formatDate(txn.date)}
          {txn.isRecurring && ` • ${txn.frequency}`}
        </Text>
        {txn.category && <Text style={styles.transactionCategory}>{txn.category}</Text>}
      </View>
      <Text
        style={[
          styles.transactionAmount,
          txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
        ]}
      >
        {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

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

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={brandColors.textGray}
        />
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
  searchContainer: {
    padding: 16,
    backgroundColor: brandColors.white,
  },
  searchInput: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
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
