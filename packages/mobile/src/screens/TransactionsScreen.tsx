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
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { generateTransactionInstances } from '../utils/transactionInstances';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { brandColors } from '../theme/colors';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recurring'>('upcoming');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const renderTransaction = (txn: Transaction) => {
    const displayName = txn.description || txn.name || 'Unnamed Transaction';
    const displayAmount = Math.abs(txn.amount || 0);
    const frequency = txn.recurringDetails?.frequency || txn.frequency;

    return (
      <View key={txn.instanceId || txn.id} style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionName}>{displayName}</Text>
            {txn.isInstance && (
              <Icon name="repeat" size={14} color={brandColors.textGray} style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.transactionDate}>
            {formatDate(txn.date)}
            {txn.isRecurring && frequency && ` • ${frequency}`}
          </Text>
          {txn.category && <Text style={styles.transactionCategory}>{txn.category}</Text>}
        </View>

        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {txn.type === 'income' ? '+' : '-'}${displayAmount.toFixed(2)}
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPress(txn)}
            >
              <Icon name="pencil" size={18} color={brandColors.textGray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePress(txn)}
            >
              <Icon name="trash-can-outline" size={18} color={brandColors.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
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

        <View style={styles.accountFilterContainer}>
          <Text style={styles.filterLabel}>Account:</Text>
          <View style={styles.scrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              style={styles.accountScroll}
              contentContainerStyle={styles.scrollContentHorizontal}
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
          <ActivityIndicator size="large" color={brandColors.tealPrimary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions found</Text>
            </View>
          ) : (
            filteredTransactions.map(renderTransaction)
          )}
        </ScrollView>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="alert-circle-outline" size={48} color={brandColors.red} />
            </View>

            <Text style={styles.modalTitle}>Delete Transaction</Text>
            <Text style={styles.modalMessage}>{getDeleteModalMessage()}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, deleting && styles.buttonDisabled]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={brandColors.white} />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Choice Modal (for recurring instances) */}
      <Modal
        visible={editChoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditChoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="pencil-circle-outline" size={48} color={brandColors.tealPrimary} />
            </View>

            <Text style={styles.modalTitle}>Edit Recurring Transaction</Text>
            <Text style={styles.modalMessage}>
              Do you want to edit only this occurrence or the entire series?
            </Text>

            <View style={styles.choiceButtons}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleEditChoiceSelected('single')}
              >
                <Text style={styles.choiceButtonText}>Edit This Occurrence Only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceButton, styles.choiceButtonPrimary]}
                onPress={() => handleEditChoiceSelected('series')}
              >
                <Text style={[styles.choiceButtonText, styles.choiceButtonTextPrimary]}>
                  Edit Entire Series
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelLinkButton}
              onPress={() => {
                setEditChoiceModalVisible(false);
                setTransactionToEdit(null);
              }}
            >
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Icon name="close" size={24} color={brandColors.textDark} />
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Transaction</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.editForm}>
            {/* Description */}
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

            {/* Amount */}
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

            {/* Type */}
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

            {/* Category */}
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

            {/* Date */}
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

            {/* Account */}
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

            {/* Frequency (only show for recurring series) */}
            {((transactionToEdit?.isRecurring && !transactionToEdit?.isInstance) ||
              (transactionToEdit?.isInstance && editChoice === 'series')) && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Frequency</Text>
                <View style={styles.frequencyButtons}>
                  <TouchableOpacity
                    style={[styles.frequencyButton, editFrequency === 'weekly' && styles.frequencyButtonActive]}
                    onPress={() => setEditFrequency('weekly')}
                  >
                    <Text style={[styles.frequencyButtonText, editFrequency === 'weekly' && styles.frequencyButtonTextActive]}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.frequencyButton, editFrequency === 'biweekly' && styles.frequencyButtonActive]}
                    onPress={() => setEditFrequency('biweekly')}
                  >
                    <Text style={[styles.frequencyButtonText, editFrequency === 'biweekly' && styles.frequencyButtonTextActive]}>
                      Biweekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.frequencyButton, editFrequency === 'monthly' && styles.frequencyButtonActive]}
                    onPress={() => setEditFrequency('monthly')}
                  >
                    <Text style={[styles.frequencyButtonText, editFrequency === 'monthly' && styles.frequencyButtonTextActive]}>
                      Monthly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.editFooter}>
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

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          // Transaction list will auto-update via Firestore listener
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
      >
        <Icon name="plus" size={28} color={brandColors.white} />
      </TouchableOpacity>
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
    borderBottomColor: brandColors.tealPrimary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  activeTabText: {
    color: brandColors.tealPrimary,
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
  scrollContentHorizontal: {
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
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
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
  listContent: {
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
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: brandColors.tealPrimary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  incomeAmount: {
    color: brandColors.green,
  },
  expenseAmount: {
    color: brandColors.red,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: brandColors.backgroundOffWhite,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  // Choice modal styles
  choiceButtons: {
    width: '100%',
    gap: 12,
  },
  choiceButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  choiceButtonPrimary: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  choiceButtonTextPrimary: {
    color: brandColors.white,
  },
  cancelLinkButton: {
    marginTop: 16,
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  // Edit modal styles
  editModalContainer: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  editForm: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: brandColors.textDark,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  typeButtonActive: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
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
    borderRadius: 8,
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  accountOptionActive: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  accountOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textDark,
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
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  frequencyButtonActive: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  frequencyButtonTextActive: {
    color: brandColors.white,
  },
  editFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  saveButton: {
    backgroundColor: brandColors.tealPrimary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.white,
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
});
