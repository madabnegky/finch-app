// packages/mobile/src/screens/TransactionsScreen.tsx
// Redesigned in Executive+ Style with Full Backend Integration
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { generateTransactionInstances } from '../utils/transactionInstances';
import { AddTransactionModal } from '../components/AddTransactionModal';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';
import { syncBudgetsWithRecurring } from '../services/budgetService';
import { hasPremiumAccess } from '../utils/premiumAccess';
import type { RecurringTransaction, UserProfile } from '../types';

type Transaction = {
  id: string;
  name?: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
  isRecurring: boolean;
  isInstance?: boolean;
  instanceId?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  recurringDetails?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    nextDate: string;
    excludedDates?: string[];
  };
  accountId?: string;
};

type Account = {
  id: string;
  name: string;
};

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editChoiceModalVisible, setEditChoiceModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editChoice, setEditChoice] = useState<'single' | 'series' | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editFrequency, setEditFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');

  // Add transaction modal state
  const [addModalVisible, setAddModalVisible] = useState(false);

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

  // Fetch user profile
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setUserProfile(doc.data() as UserProfile);
          }
        },
        (error) => {
          console.error('Error fetching user profile:', error);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Fetch ALL transactions from Firestore
  useEffect(() => {
    if (!user) return;

    setLoading(true);

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

  // Generate instances from recurring transactions
  const allInstances = useMemo(() => {
    console.log('TransactionsScreen - Generating instances from', transactions.length, 'transactions');
    const instances = generateTransactionInstances(transactions, 365);
    console.log('TransactionsScreen - Generated', instances.length, 'instances');
    return instances;
  }, [transactions]);

  // Filter transactions based on active tab
  const filteredTransactions = useMemo(() => {
    const dataSource = activeTab === 'recurring' ? transactions : allInstances;

    const filtered = dataSource.filter((txn) => {
      const transactionName = txn.description || txn.name || '';
      const matchesSearch = transactionName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAccount = selectedAccountId === 'all' || txn.accountId === selectedAccountId;

      if (activeTab === 'recurring') {
        return txn.isRecurring && !txn.isInstance && matchesSearch && matchesAccount;
      } else if (activeTab === 'upcoming') {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const txnDate = txn.date instanceof Date ? txn.date : (txn.date?.toDate ? txn.date.toDate() : new Date(txn.date));
        return txnDate >= now && matchesSearch && matchesAccount;
      } else {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const txnDate = txn.date instanceof Date ? txn.date : (txn.date?.toDate ? txn.date.toDate() : new Date(txn.date));
        return txnDate < now && matchesSearch && matchesAccount;
      }
    }).sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : (a.date?.toDate ? a.date.toDate() : new Date(a.date));
      const dateB = b.date instanceof Date ? b.date : (b.date?.toDate ? b.date.toDate() : new Date(b.date));
      return activeTab === 'history'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    console.log(`TransactionsScreen - ${activeTab} tab: ${filtered.length} filtered from ${dataSource.length} total`);
    return filtered;
  }, [transactions, allInstances, activeTab, searchQuery, selectedAccountId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const toDateInputString = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  // Helper function to sync budgets for premium users
  const syncBudgetsIfPremium = async () => {
    if (!user || !userProfile) return;

    const isPremium = hasPremiumAccess(userProfile, user.uid);
    if (!isPremium) {
      console.log('⏭️ TransactionsScreen: User is not premium, skipping budget sync');
      return;
    }

    try {
      console.log('🔄 TransactionsScreen: Syncing budgets with recurring transactions...');

      // Fetch all recurring transactions from /transactions where isRecurring: true
      const recurringSnapshot = await firestore()
        .collection(`users/${user.uid}/transactions`)
        .get();

      // Map to RecurringTransaction format - client-side filter for isRecurring: true
      const recurringTransactionsForSync = recurringSnapshot.docs
        .filter(doc => doc.data().isRecurring === true)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            description: data.description || '',
            amount: Math.abs(data.amount || 0),
            type: data.type || 'expense',
            category: data.category || 'Uncategorized',
            frequency: (data.recurringDetails?.frequency || 'monthly') as any,
            isActive: true,
          };
        }) as RecurringTransaction[];

      console.log(`📋 TransactionsScreen: Found ${recurringTransactionsForSync.length} recurring transactions for budget sync`);

      const result = await syncBudgetsWithRecurring(user.uid, recurringTransactionsForSync);
      console.log(`✅ Budget sync complete: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);

      if (result.deleted > 0) {
        Alert.alert(
          'Budgets Updated',
          `${result.deleted} budget${result.deleted > 1 ? 's' : ''} automatically removed after deleting recurring transaction.`
        );
      }
    } catch (error) {
      console.error('❌ TransactionsScreen: Error syncing budgets:', error);
      Alert.alert(
        'Budget Sync Error',
        'Failed to sync budgets. Please try again.'
      );
    }
  };

  // Handle delete transaction
  const handleDeletePress = (txn: Transaction) => {
    setTransactionToDelete(txn);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !user) return;

    setDeleting(true);
    try {
      if (transactionToDelete.isRecurring && !transactionToDelete.isInstance) {
        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToDelete.id)
          .delete();
        console.log('Deleted entire recurring series:', transactionToDelete.id);

        // Sync budgets after deleting recurring transaction
        setTimeout(() => {
          syncBudgetsIfPremium();
        }, 500);
      } else if (transactionToDelete.isInstance && transactionToDelete.id) {
        const txnDate = transactionToDelete.date instanceof Date
          ? transactionToDelete.date
          : (transactionToDelete.date?.toDate ? transactionToDelete.date.toDate() : new Date(transactionToDelete.date));

        const dateString = toDateInputString(txnDate);

        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToDelete.id)
          .update({
            'recurringDetails.excludedDates': firestore.FieldValue.arrayUnion(dateString)
          });
        console.log('Excluded instance date from series:', dateString);
      } else {
        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToDelete.id)
          .delete();
        console.log('Deleted one-time transaction:', transactionToDelete.id);
      }

      setDeleteModalVisible(false);
      setTransactionToDelete(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle edit transaction
  const handleEditPress = (txn: Transaction) => {
    setTransactionToEdit(txn);

    // Pre-fill form with existing data
    setEditDescription(txn.description || txn.name || '');
    setEditAmount(Math.abs(txn.amount).toString());
    setEditType(txn.type);
    setEditCategory(txn.category || '');
    setEditAccountId(txn.accountId || (accounts.length > 0 ? accounts[0].id : ''));

    const txnDate = txn.date instanceof Date ? txn.date : (txn.date?.toDate ? txn.date.toDate() : new Date(txn.date));
    setEditDate(toDateInputString(txnDate));

    if (txn.recurringDetails) {
      setEditFrequency(txn.recurringDetails.frequency);
    } else if (txn.frequency) {
      setEditFrequency(txn.frequency);
    }

    // If it's a recurring instance, show choice modal first
    if (txn.isInstance) {
      setEditChoiceModalVisible(true);
    } else {
      // For one-time or series, go straight to edit modal
      setEditModalVisible(true);
    }
  };

  const handleEditChoiceSelected = (choice: 'single' | 'series') => {
    setEditChoice(choice);
    setEditChoiceModalVisible(false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!transactionToEdit || !user) return;

    if (!editDescription.trim() || !editAmount.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const amount = editType === 'expense' ? -Math.abs(parseFloat(editAmount)) : Math.abs(parseFloat(editAmount));

      // Scenario 1: Editing a master recurring series
      if (transactionToEdit.isRecurring && !transactionToEdit.isInstance) {
        const updatedSeries = {
          description: editDescription,
          amount,
          type: editType,
          category: editCategory,
          accountId: editAccountId,
          isRecurring: true,
          recurringDetails: {
            frequency: editFrequency,
            nextDate: editDate,
            excludedDates: transactionToEdit.recurringDetails?.excludedDates || [],
          },
        };

        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToEdit.id)
          .update(updatedSeries);

        console.log('Updated recurring series:', transactionToEdit.id);
      }
      // Scenario 2: Editing a single instance (create new one-time + exclude original date)
      else if (transactionToEdit.isInstance && editChoice === 'single') {
        const batch = firestore().batch();

        // Create new one-time transaction
        const newTransaction = {
          description: editDescription,
          amount,
          type: editType,
          category: editCategory,
          accountId: editAccountId,
          date: parseDateString(editDate),
          isRecurring: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        };

        const newDocRef = firestore().collection(`users/${user.uid}/transactions`).doc();
        batch.set(newDocRef, newTransaction);

        // Exclude the original date from the series
        const originalDate = transactionToEdit.date instanceof Date
          ? transactionToEdit.date
          : (transactionToEdit.date?.toDate ? transactionToEdit.date.toDate() : new Date(transactionToEdit.date));

        batch.update(
          firestore().collection(`users/${user.uid}/transactions`).doc(transactionToEdit.id),
          {
            'recurringDetails.excludedDates': firestore.FieldValue.arrayUnion(toDateInputString(originalDate))
          }
        );

        await batch.commit();
        console.log('Created new one-time transaction and excluded original date');
      }
      // Scenario 3: Editing entire series (from instance)
      else if (transactionToEdit.isInstance && editChoice === 'series') {
        const updatedSeries = {
          description: editDescription,
          amount,
          type: editType,
          category: editCategory,
          accountId: editAccountId,
          isRecurring: true,
          recurringDetails: {
            frequency: editFrequency,
            nextDate: editDate,
            excludedDates: transactionToEdit.recurringDetails?.excludedDates || [],
          },
        };

        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToEdit.id)
          .update(updatedSeries);

        console.log('Updated entire series from instance');
      }
      // Scenario 4: Editing a one-time transaction
      else {
        const updatedTransaction = {
          description: editDescription,
          amount,
          type: editType,
          category: editCategory,
          accountId: editAccountId,
          date: parseDateString(editDate),
        };

        await firestore()
          .collection(`users/${user.uid}/transactions`)
          .doc(transactionToEdit.id)
          .update(updatedTransaction);

        console.log('Updated one-time transaction:', transactionToEdit.id);
      }

      setEditModalVisible(false);
      setTransactionToEdit(null);
      setEditChoice(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getDeleteModalMessage = () => {
    if (!transactionToDelete) return '';

    const displayName = transactionToDelete.description || transactionToDelete.name || 'this transaction';

    if (transactionToDelete.isRecurring && !transactionToDelete.isInstance) {
      return `This will delete the entire recurring series for "${displayName}".`;
    } else if (transactionToDelete.isInstance) {
      return `This will delete only this single occurrence of "${displayName}".`;
    } else {
      return `Are you sure you want to delete "${displayName}"?`;
    }
  };

  const getCategoryIcon = (category?: string, type?: string) => {
    if (!category) return type === 'income' ? 'cash-plus' : 'cash-minus';

    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('rent') || categoryLower.includes('home')) return 'home';
    if (categoryLower.includes('food') || categoryLower.includes('groceries')) return 'food';
    if (categoryLower.includes('transport') || categoryLower.includes('car')) return 'car';
    if (categoryLower.includes('entertainment')) return 'movie';
    if (categoryLower.includes('health')) return 'medical-bag';
    if (categoryLower.includes('utilities') || categoryLower.includes('electric')) return 'lightning-bolt';
    if (categoryLower.includes('shopping')) return 'shopping';

    return type === 'income' ? 'cash-plus' : 'cash-minus';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CUSTOM HEADER */}
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
              <Text style={styles.headerTitle}>Transactions</Text>
              <Text style={styles.headerSubtitle}>Track Your Spending</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchButton}>
            <Icon name="magnify" size={24} color={brandColors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        {(['upcoming', 'history', 'recurring'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FILTERS */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={brandColors.textGray}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountFilterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedAccountId === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedAccountId('all')}
          >
            <Text style={[styles.filterChipText, selectedAccountId === 'all' && styles.filterChipTextActive]}>
              All Accounts
            </Text>
          </TouchableOpacity>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[styles.filterChip, selectedAccountId === account.id && styles.filterChipActive]}
              onPress={() => setSelectedAccountId(account.id)}
            >
              <Text style={[styles.filterChipText, selectedAccountId === account.id && styles.filterChipTextActive]}>
                {account.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* TRANSACTION LIST */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="receipt-text-outline" size={48} color={brandColors.textGray} />
            </View>
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'upcoming' ? 'No upcoming transactions found' :
               activeTab === 'history' ? 'No transaction history' :
               'No recurring transactions set up'}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((txn) => {
            const displayName = txn.description || txn.name || 'Unnamed Transaction';
            const displayAmount = Math.abs(txn.amount || 0);
            const frequency = txn.recurringDetails?.frequency || txn.frequency;

            return (
              <View key={txn.instanceId || txn.id} style={styles.transactionCard}>
                <View style={styles.transactionContent}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: txn.type === 'income' ? brandColors.success + '15' : brandColors.error + '15' }
                  ]}>
                    <Icon
                      name={getCategoryIcon(txn.category, txn.type)}
                      size={24}
                      color={txn.type === 'income' ? brandColors.success : brandColors.error}
                    />
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionTop}>
                      <Text style={styles.transactionName}>{displayName}</Text>
                      {txn.isInstance && (
                        <View style={styles.recurringBadge}>
                          <Icon name="repeat" size={12} color={brandColors.textGray} />
                        </View>
                      )}
                    </View>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionDate}>{formatDate(txn.date)}</Text>
                      {frequency && (
                        <>
                          <Text style={styles.transactionMetaDot}>•</Text>
                          <Text style={styles.transactionFrequency}>{frequency}</Text>
                        </>
                      )}
                      {txn.category && txn.type !== 'income' && (
                        <>
                          <Text style={styles.transactionMetaDot}>•</Text>
                          <Text style={styles.transactionCategory}>{txn.category}</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                    ]}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(displayAmount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPress(txn)}
                  >
                    <Icon name="pencil" size={16} color={brandColors.tealPrimary} />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => handleDeletePress(txn)}
                  >
                    <Icon name="delete" size={16} color={brandColors.error} />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Icon name="plus" size={28} color={brandColors.white} />
      </TouchableOpacity>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: brandColors.error + '15' }]}>
                <Icon name="alert-circle" size={32} color={brandColors.error} />
              </View>
              <Text style={styles.modalTitle}>Delete Transaction?</Text>
              <Text style={styles.modalMessage}>{getDeleteModalMessage()}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={brandColors.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EDIT CHOICE MODAL */}
      <Modal
        visible={editChoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditChoiceModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditChoiceModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: brandColors.tealPrimary + '15' }]}>
                <Icon name="pencil-circle" size={32} color={brandColors.tealPrimary} />
              </View>
              <Text style={styles.modalTitle}>Edit Recurring Transaction</Text>
              <Text style={styles.modalMessage}>
                Do you want to edit only this occurrence or the entire series?
              </Text>
            </View>

            <View style={styles.choiceButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => handleEditChoiceSelected('single')}
              >
                <Text style={styles.modalButtonTextSecondary}>This Occurrence</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleEditChoiceSelected('series')}
              >
                <Text style={styles.modalButtonText}>Entire Series</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EDIT TRANSACTION MODAL - Keep the existing full edit modal*/}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Icon name="close" size={24} color={brandColors.textDark} />
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Transaction</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.editForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.formInput}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter description"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount</Text>
              <TextInput
                style={styles.formInput}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'expense' && styles.typeButtonActive]}
                  onPress={() => setEditType('expense')}
                >
                  <Text style={[styles.typeButtonText, editType === 'expense' && styles.typeButtonTextActive]}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'income' && styles.typeButtonActive]}
                  onPress={() => setEditType('income')}
                >
                  <Text style={[styles.typeButtonText, editType === 'income' && styles.typeButtonTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Enter category"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date</Text>
              <TextInput
                style={styles.formInput}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account</Text>
              <View style={styles.accountSelect}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountOption,
                      editAccountId === account.id && styles.accountOptionActive,
                    ]}
                    onPress={() => setEditAccountId(account.id)}
                  >
                    <Text
                      style={[
                        styles.accountOptionText,
                        editAccountId === account.id && styles.accountOptionTextActive,
                      ]}
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {((transactionToEdit?.isRecurring && !transactionToEdit?.isInstance) ||
              (transactionToEdit?.isInstance && editChoice === 'series')) && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Frequency</Text>
                <View style={styles.frequencyButtons}>
                  {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[styles.frequencyButton, editFrequency === freq && styles.frequencyButtonActive]}
                      onPress={() => setEditFrequency(freq)}
                    >
                      <Text style={[styles.frequencyButtonText, editFrequency === freq && styles.frequencyButtonTextActive]}>
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.editModalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSaveEdit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={brandColors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD TRANSACTION MODAL */}
      <AddTransactionModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => setAddModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background,
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
    backgroundColor: brandColors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: brandColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textSecondary,
    marginTop: 2,
  },
  searchButton: {
    padding: 8,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: brandColors.white,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: brandColors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },
  activeTabText: {
    color: brandColors.primary,
    fontWeight: '600',
  },

  // Filter Section
  filterSection: {
    backgroundColor: brandColors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  searchInput: {
    backgroundColor: brandColors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textPrimary,
    marginBottom: 12,
  },
  accountFilterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: brandColors.background,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  filterChipActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  filterChipTextActive: {
    color: brandColors.white,
  },

  // Transaction List
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brandColors.border + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  recurringBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brandColors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionDate: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },
  transactionMetaDot: {
    fontSize: 12,
    color: brandColors.textSecondary,
  },
  transactionFrequency: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.primary,
  },
  transactionCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  incomeAmount: {
    color: brandColors.success,
  },
  expenseAmount: {
    color: brandColors.error,
  },

  // Transaction Actions
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: brandColors.primary + '10',
    borderRadius: 10,
  },
  actionButtonDanger: {
    backgroundColor: brandColors.error + '10',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.primary,
  },
  actionButtonTextDanger: {
    color: brandColors.error,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceButtons: {
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: brandColors.white,
    borderWidth: 1.5,
    borderColor: brandColors.primary,
  },
  modalButtonDanger: {
    backgroundColor: brandColors.error,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.white,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Edit Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  editForm: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: brandColors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textPrimary,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: brandColors.background,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  typeButtonActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  typeButtonTextActive: {
    color: brandColors.white,
  },
  accountSelect: {
    gap: 8,
  },
  accountOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: brandColors.background,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  accountOptionActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  accountOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  accountOptionTextActive: {
    color: brandColors.white,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: brandColors.background,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  frequencyButtonActive: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  frequencyButtonTextActive: {
    color: brandColors.white,
  },
  editModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  saveButton: {
    backgroundColor: brandColors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: brandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
