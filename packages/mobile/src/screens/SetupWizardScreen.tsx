// packages/mobile/src/screens/SetupWizardScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '../types/navigation';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  success: '#10B981',
};

type SetupMethod = 'plaid' | 'manual' | null;

type Account = {
  name: string;
  type: 'checking' | 'savings' | 'credit';
  balance: string;
  cushion: string;
};

type Transaction = {
  name: string;
  amount: string;
  type: 'income' | 'expense';
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextDate: string;
  category?: string;
  accountId?: string;
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

export const SetupWizardScreen = () => {
  const [step, setStep] = useState(1);
  const [setupMethod, setSetupMethod] = useState<SetupMethod>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  // Account form state
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountCushion, setAccountCushion] = useState('');

  // Transaction form state
  const [transactionName, setTransactionName] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [transactionFrequency, setTransactionFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [transactionNextDate, setTransactionNextDate] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('Uncategorized');
  const [transactionAccountId, setTransactionAccountId] = useState('');

  // Ref for ScrollView to enable auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNextStep = () => {
    if (step === 1 && !setupMethod) {
      Alert.alert('Selection Required', 'Please choose a setup method');
      return;
    }
    if (step === 2 && accounts.length === 0) {
      Alert.alert('Account Required', 'Please add at least one account');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleAddAccount = () => {
    if (!accountName.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }
    if (!accountBalance.trim()) {
      Alert.alert('Error', 'Please enter an account balance');
      return;
    }

    const newAccount: Account = {
      name: accountName,
      type: accountType,
      balance: accountBalance,
      cushion: accountCushion,
    };

    setAccounts([...accounts, newAccount]);

    // Show success feedback
    Alert.alert('Success', `${newAccount.name} has been added!`);

    // Scroll to bottom to show the added account
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Reset form
    setAccountName('');
    setAccountType('checking');
    setAccountBalance('');
    setAccountCushion('');
  };

  const handleAddTransaction = () => {
    if (!transactionName.trim()) {
      Alert.alert('Error', 'Please enter a transaction name');
      return;
    }
    if (!transactionAmount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    // Check account selection if multiple accounts exist
    if (accounts.length > 1 && !transactionAccountId) {
      Alert.alert('Error', 'Please select an account for this transaction');
      return;
    }

    // Validate next occurrence date for all frequencies
    if (!transactionNextDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(transactionNextDate)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    const newTransaction: Transaction = {
      name: transactionName,
      amount: transactionAmount,
      type: transactionType,
      frequency: transactionFrequency,
      nextDate: transactionNextDate,
      ...(transactionType === 'expense' && { category: transactionCategory }),
      ...(transactionAccountId && { accountId: transactionAccountId }),
    };

    setTransactions([...transactions, newTransaction]);

    // Show success feedback
    Alert.alert('Success', `${newTransaction.name} has been added!`);

    // Scroll to bottom to show the added transaction
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Reset form
    setTransactionName('');
    setTransactionAmount('');
    setTransactionType('income');
    setTransactionFrequency('monthly');
    setTransactionNextDate('');
    setTransactionCategory('Uncategorized');
    setTransactionAccountId(accounts.length === 1 ? accounts[0].name : '');
  };

  const handleFinishSetup = async () => {
    try {
      setLoading(true);

      // Import firestore functions
      const firestore = require('@react-native-firebase/firestore').default;
      const batch = firestore().batch();

      // Save accounts and create name-to-ID mapping
      const accountsCollection = firestore().collection(`users/${user?.uid}/accounts`);
      const accountNameToIdMap: { [key: string]: string } = {};

      accounts.forEach(account => {
        const newAccountRef = accountsCollection.doc();
        accountNameToIdMap[account.name] = newAccountRef.id;
        batch.set(newAccountRef, {
          name: account.name,
          type: account.type,
          currentBalance: parseFloat(account.balance) || 0,
          cushion: parseFloat(account.cushion) || 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      // Save transactions
      const transactionsCollection = firestore().collection(`users/${user?.uid}/transactions`);
      transactions.forEach(transaction => {
        const newTransactionRef = transactionsCollection.doc();
        const transactionData: any = {
          description: transaction.name,
          amount: transaction.type === 'expense'
            ? -Math.abs(parseFloat(transaction.amount) || 0)
            : Math.abs(parseFloat(transaction.amount) || 0),
          type: transaction.type,
          date: transaction.nextDate,
          isRecurring: true,
          recurringDetails: {
            frequency: transaction.frequency,
            nextDate: transaction.nextDate,
          },
          ...(transaction.category && { category: transaction.category }),
          createdAt: firestore.FieldValue.serverTimestamp(),
        };

        // Add account ID
        if (transaction.accountId && accountNameToIdMap[transaction.accountId]) {
          // User selected a specific account
          transactionData.accountId = accountNameToIdMap[transaction.accountId];
        } else if (accounts.length === 1) {
          // Only one account - assign all transactions to it
          transactionData.accountId = accountNameToIdMap[accounts[0].name];
        }

        batch.set(newTransactionRef, transactionData);
      });

      await batch.commit();
      console.log('Setup completed successfully!');

      // Navigate to main tabs (dashboard)
      navigation.replace('Dashboard');
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Setup Method</Text>
      <Text style={styles.stepDescription}>
        How would you like to add your accounts?
      </Text>

      <TouchableOpacity
        style={[
          styles.methodCard,
          setupMethod === 'plaid' && styles.methodCardSelected,
        ]}
        onPress={() => setSetupMethod('plaid')}
      >
        <Text style={styles.methodTitle}>Plaid (Recommended)</Text>
        <Text style={styles.methodDescription}>
          Connect your bank accounts securely
        </Text>
        <Text style={styles.comingSoonBadge}>Coming Soon</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodCard,
          setupMethod === 'manual' && styles.methodCardSelected,
        ]}
        onPress={() => setSetupMethod('manual')}
      >
        <Text style={styles.methodTitle}>Manual Entry</Text>
        <Text style={styles.methodDescription}>
          Enter your account details manually
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add Your Accounts</Text>
      <Text style={styles.stepDescription}>
        Add at least one account to get started
      </Text>

      {/* Account Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          style={styles.input}
          value={accountName}
          onChangeText={setAccountName}
          placeholder="e.g., Chase Checking"
          placeholderTextColor={brandColors.textGray}
        />

        <Text style={styles.label}>Account Type</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              accountType === 'checking' && styles.segmentSelected,
            ]}
            onPress={() => setAccountType('checking')}
          >
            <Text
              style={[
                styles.segmentText,
                accountType === 'checking' && styles.segmentTextSelected,
              ]}
            >
              Checking
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              accountType === 'savings' && styles.segmentSelected,
            ]}
            onPress={() => setAccountType('savings')}
          >
            <Text
              style={[
                styles.segmentText,
                accountType === 'savings' && styles.segmentTextSelected,
              ]}
            >
              Savings
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Current Balance (USD)</Text>
        <TextInput
          style={styles.input}
          value={accountBalance}
          onChangeText={setAccountBalance}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={brandColors.textGray}
        />

        <View style={styles.labelWithHelp}>
          <Text style={styles.label}>Cushion (Optional)</Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Account Cushion',
              'A cushion is the minimum balance you want to maintain in this account. It helps you avoid overdrafts and keeps a safety buffer.'
            )}
            style={styles.helpIcon}
          >
            <Text style={styles.helpIconText}>?</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={accountCushion}
          onChangeText={setAccountCushion}
          placeholder="0.00 (USD)"
          keyboardType="numeric"
          placeholderTextColor={brandColors.textGray}
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
          <Text style={styles.addButtonText}>Add Account</Text>
        </TouchableOpacity>
      </View>

      {/* Accounts List */}
      {accounts.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Added Accounts ({accounts.length})</Text>
          {accounts.map((account, index) => (
            <View key={index} style={styles.listItem}>
              <View>
                <Text style={styles.listItemName}>{account.name}</Text>
                <Text style={styles.listItemDetails}>
                  {account.type} • ${account.balance}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Recurring Transactions</Text>
      <Text style={styles.stepDescription}>
        Add your regular income and bills (optional)
      </Text>

      {/* Transaction Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Transaction Name</Text>
        <TextInput
          style={styles.input}
          value={transactionName}
          onChangeText={setTransactionName}
          placeholder="e.g., Paycheck, Rent"
          placeholderTextColor={brandColors.textGray}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              transactionType === 'income' && styles.segmentSelected,
            ]}
            onPress={() => setTransactionType('income')}
          >
            <Text
              style={[
                styles.segmentText,
                transactionType === 'income' && styles.segmentTextSelected,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              transactionType === 'expense' && styles.segmentSelected,
            ]}
            onPress={() => setTransactionType('expense')}
          >
            <Text
              style={[
                styles.segmentText,
                transactionType === 'expense' && styles.segmentTextSelected,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Amount (USD)</Text>
        <TextInput
          style={styles.input}
          value={transactionAmount}
          onChangeText={setTransactionAmount}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={brandColors.textGray}
        />

        {/* Account selector - only show if multiple accounts */}
        {accounts.length > 1 && (
          <>
            <Text style={styles.label}>Account</Text>
            <View style={styles.categoryGrid}>
              {accounts.map((account, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryButton,
                    transactionAccountId === account.name && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setTransactionAccountId(account.name)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      transactionAccountId === account.name && styles.categoryButtonTextSelected,
                    ]}
                  >
                    {account.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Category selector - only show for expenses */}
        {transactionType === 'expense' && (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    transactionCategory === category && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setTransactionCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      transactionCategory === category && styles.categoryButtonTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Frequency</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              transactionFrequency === 'weekly' && styles.segmentSelected,
            ]}
            onPress={() => setTransactionFrequency('weekly')}
          >
            <Text
              style={[
                styles.segmentText,
                transactionFrequency === 'weekly' && styles.segmentTextSelected,
              ]}
            >
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              transactionFrequency === 'biweekly' && styles.segmentSelected,
            ]}
            onPress={() => setTransactionFrequency('biweekly')}
          >
            <Text
              style={[
                styles.segmentText,
                transactionFrequency === 'biweekly' && styles.segmentTextSelected,
              ]}
            >
              Biweekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              transactionFrequency === 'monthly' && styles.segmentSelected,
            ]}
            onPress={() => setTransactionFrequency('monthly')}
          >
            <Text
              style={[
                styles.segmentText,
                transactionFrequency === 'monthly' && styles.segmentTextSelected,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Next Occurrence Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={transactionNextDate}
          onChangeText={setTransactionNextDate}
          placeholder="2025-01-15"
          placeholderTextColor={brandColors.textGray}
        />
        <Text style={styles.helperText}>
          Example: 2025-01-15 for January 15, 2025
        </Text>

        <TouchableOpacity style={styles.addButton} onPress={handleAddTransaction}>
          <Text style={styles.addButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      {transactions.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Added Transactions ({transactions.length})</Text>
          {transactions.map((transaction, index) => (
            <View key={index} style={styles.listItem}>
              <View>
                <Text style={styles.listItemName}>{transaction.name}</Text>
                <Text style={styles.listItemDetails}>
                  {transaction.type} • ${transaction.amount} • {transaction.frequency}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Setup Wizard</Text>
        <Text style={styles.headerStep}>Step {step} of 3</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handlePrevStep}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.nextButton, step === 1 && styles.fullWidth]}
            onPress={handleNextStep}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, styles.fullWidth, loading && styles.buttonDisabled]}
            onPress={handleFinishSetup}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Saving...' : 'Finish Setup'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.primaryBlue,
    marginBottom: 4,
  },
  headerStep: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  progressBar: {
    height: 4,
    backgroundColor: brandColors.lightGray,
  },
  progressFill: {
    height: '100%',
    backgroundColor: brandColors.primaryBlue,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingVertical: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: brandColors.textGray,
    marginBottom: 24,
  },
  methodCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brandColors.lightGray,
    marginBottom: 16,
  },
  methodCardSelected: {
    borderColor: brandColors.primaryBlue,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  comingSoonBadge: {
    marginTop: 8,
    fontSize: 12,
    color: brandColors.textGray,
    fontStyle: 'italic',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  helpIcon: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brandColors.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpIconText: {
    color: brandColors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: brandColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  addButton: {
    backgroundColor: brandColors.primaryBlue,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    marginTop: 24,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  listItemDetails: {
    fontSize: 14,
    color: brandColors.textGray,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: brandColors.white,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.primaryBlue,
  },
  backButtonText: {
    color: brandColors.primaryBlue,
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.primaryBlue,
  },
  nextButtonText: {
    color: brandColors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  fullWidth: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  helperText: {
    fontSize: 12,
    color: brandColors.textGray,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
