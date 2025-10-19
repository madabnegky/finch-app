import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
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

const EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Groceries',
  'Shopping',
  'Health',
  'Subscriptions',
  'Utilities',
  'Personal Care',
  'Travel',
  'Gifts & Donations',
  'Entertainment',
  'Uncategorized',
];

type Account = {
  id: string;
  name: string;
};

type AddTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [nextDate, setNextDate] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    // Initialize with today's date in YYYY-MM-DD format in UTC
    const today = new Date();
    return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Fetch accounts
  useEffect(() => {
    if (!user || !visible) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot((snapshot) => {
        const accountsData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Account',
        }));
        setAccounts(accountsData);

        // Auto-select first account if only one exists
        if (accountsData.length === 1) {
          setSelectedAccountId(accountsData[0].id);
        }
      });

    return () => unsubscribe();
  }, [user, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a transaction name');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid amount');
      return;
    }

    // Check account selection if multiple accounts exist
    if (accounts.length > 1 && !selectedAccountId) {
      Alert.alert('Required', 'Please select an account');
      return;
    }

    // Validate date fields
    if (isRecurring) {
      if (!nextDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format');
        return;
      }
    } else {
      if (!transactionDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
        Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format');
        return;
      }
    }

    try {
      setSaving(true);

      // Convert date string to Firestore Timestamp
      const dateString = isRecurring ? nextDate : transactionDate;
      const [year, month, day] = dateString.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day); // month is 0-indexed
      dateObj.setHours(0, 0, 0, 0);

      const transactionData: any = {
        description: name.trim(),
        amount: type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        type,
        ...(type === 'expense' && { category }),
        date: firestore.Timestamp.fromDate(dateObj),
        isRecurring,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      // Add account reference if account was selected
      if (selectedAccountId) {
        transactionData.accountId = selectedAccountId;
      }

      // Add recurring fields in recurringDetails object (matching web app structure)
      if (isRecurring) {
        transactionData.recurringDetails = {
          frequency: frequency,
          nextDate: nextDate,
        };
      }

      await firestore()
        .collection(`users/${user?.uid}/transactions`)
        .add(transactionData);

      // Reset form
      setName('');
      setAmount('');
      setCategory('Uncategorized');
      setIsRecurring(false);
      setFrequency('monthly');
      setNextDate('');
      const today = new Date();
      setTransactionDate(`${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`);
      setSelectedAccountId(accounts.length === 1 ? accounts[0].id : '');
      setType('expense');

      Alert.alert('Success', 'Transaction added successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Transaction</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Type Selector */}
            <Text style={styles.label}>Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  type === 'income' && styles.segmentSelected,
                ]}
                onPress={() => setType('income')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'income' && styles.segmentTextSelected,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  type === 'expense' && styles.segmentSelected,
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'expense' && styles.segmentTextSelected,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={styles.label}>Transaction Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Rent, Paycheck, Netflix"
              placeholderTextColor={brandColors.textGray}
            />

            {/* Amount */}
            <Text style={styles.label}>Amount (USD)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={brandColors.textGray}
            />

            {/* Account Selector (only if multiple accounts) */}
            {accounts.length > 1 && (
              <>
                <Text style={styles.label}>Account</Text>
                <View style={styles.accountGrid}>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.accountButton,
                        selectedAccountId === account.id && styles.accountButtonSelected,
                      ]}
                      onPress={() => setSelectedAccountId(account.id)}
                    >
                      <Text
                        style={[
                          styles.accountButtonText,
                          selectedAccountId === account.id && styles.accountButtonTextSelected,
                        ]}
                      >
                        {account.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Category (only for expenses) */}
            {type === 'expense' && (
              <>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          category === cat && styles.categoryButtonTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Recurring Toggle */}
            <View style={styles.recurringToggle}>
              <Text style={styles.label}>Recurring Transaction</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    !isRecurring && styles.segmentSelected,
                  ]}
                  onPress={() => setIsRecurring(false)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !isRecurring && styles.segmentTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    isRecurring && styles.segmentSelected,
                  ]}
                  onPress={() => setIsRecurring(true)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isRecurring && styles.segmentTextSelected,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* One-off Transaction Date */}
            {!isRecurring && (
              <>
                <Text style={styles.label}>Transaction Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={transactionDate}
                  onChangeText={setTransactionDate}
                  placeholder="2025-10-18"
                  placeholderTextColor={brandColors.textGray}
                />
                <Text style={styles.helperText}>
                  Example: 2025-10-18 for October 18, 2025
                </Text>
              </>
            )}

            {/* Recurring Options */}
            {isRecurring && (
              <>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      frequency === 'weekly' && styles.segmentSelected,
                    ]}
                    onPress={() => setFrequency('weekly')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        frequency === 'weekly' && styles.segmentTextSelected,
                      ]}
                    >
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      frequency === 'biweekly' && styles.segmentSelected,
                    ]}
                    onPress={() => setFrequency('biweekly')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        frequency === 'biweekly' && styles.segmentTextSelected,
                      ]}
                    >
                      Biweekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segment,
                      frequency === 'monthly' && styles.segmentSelected,
                    ]}
                    onPress={() => setFrequency('monthly')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        frequency === 'monthly' && styles.segmentTextSelected,
                      ]}
                    >
                      Monthly
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Next Occurrence Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={nextDate}
                  onChangeText={setNextDate}
                  placeholder="2025-01-15"
                  placeholderTextColor={brandColors.textGray}
                />
                <Text style={styles.helperText}>
                  Example: 2025-01-15 for January 15, 2025
                </Text>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: brandColors.textGray,
  },
  content: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    backgroundColor: brandColors.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: brandColors.white,
  },
  segmentSelected: {
    backgroundColor: brandColors.primaryBlue,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  segmentTextSelected: {
    color: brandColors.white,
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  accountButtonSelected: {
    backgroundColor: brandColors.primaryBlue,
    borderColor: brandColors.primaryBlue,
  },
  accountButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  accountButtonTextSelected: {
    color: brandColors.white,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  categoryButtonSelected: {
    backgroundColor: brandColors.primaryBlue,
    borderColor: brandColors.primaryBlue,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  categoryButtonTextSelected: {
    color: brandColors.white,
  },
  recurringToggle: {
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: brandColors.textGray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.primaryBlue,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
