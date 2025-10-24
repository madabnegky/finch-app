import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import brandColors from '../theme/colors';

interface Account {
  id: string;
  name: string;
  availableToSpend: number;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
}

interface DeallocateFundsModalProps {
  visible: boolean;
  goal: Goal | null;
  accounts: Account[];
  onClose: () => void;
  onSave: (goal: Goal, amount: number, accountId: string) => void;
}

export const DeallocateFundsModal: React.FC<DeallocateFundsModalProps> = ({
  visible,
  goal,
  accounts,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Auto-select account if there's only one
  useEffect(() => {
    if (accounts && accounts.length === 1) {
      setSelectedAccountId(accounts[0].id);
    } else if (accounts && accounts.length > 1 && !selectedAccountId) {
      setSelectedAccountId('');
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = accounts?.find(acc => acc.id === selectedAccountId);

  const handleSave = () => {
    if (!goal) return;

    // Clean commas before parsing (parseFloat stops at commas, so "1,000" becomes 1)
    const cleanAmount = amount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const amountNum = parseFloat(cleanAmount);

    if (!amount || isNaN(amountNum)) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Validate account selection for multiple accounts
    if (accounts && accounts.length > 1 && !selectedAccountId) {
      setError('Please select an account');
      return;
    }

    // Validate against goal's allocated amount
    if (amountNum > (goal.allocatedAmount || 0)) {
      setError(`Cannot remove more than ${formatCurrency(goal.allocatedAmount || 0)} allocated to this goal`);
      return;
    }

    onSave(goal, amountNum, selectedAccountId);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    setSelectedAccountId('');
    onClose();
  };

  if (!goal) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Remove Funds from "{goal.name}"</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Account Selection - only show if multiple accounts */}
            {accounts && accounts.length > 1 && (
              <View style={styles.accountSelection}>
                <Text style={styles.label}>Return Funds To</Text>
                <View style={styles.accountButtons}>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[
                        styles.accountButton,
                        selectedAccountId === account.id && styles.accountButtonSelected,
                      ]}
                      onPress={() => {
                        setSelectedAccountId(account.id);
                        setError('');
                      }}
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
              </View>
            )}

            {/* Allocated Amount Display */}
            <View style={styles.allocatedBox}>
              <Text style={styles.allocatedText}>
                {formatCurrency(goal.allocatedAmount || 0)} allocated to this goal
              </Text>
            </View>

            {selectedAccount && (
              <View style={styles.returnToBox}>
                <Text style={styles.returnToText}>
                  Funds will be returned to {selectedAccount.name}
                </Text>
              </View>
            )}

            {/* Current Goal Progress */}
            <View style={styles.progressInfo}>
              <Text style={styles.label}>Current Progress</Text>
              <Text style={styles.progressText}>
                {formatCurrency(goal.allocatedAmount || 0)} of {formatCurrency(goal.targetAmount)}
              </Text>
            </View>

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amount to Remove</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    setError('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={brandColors.textGray}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* New Total Preview */}
            {amount && !error && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>New Total</Text>
                <Text style={styles.previewAmount}>
                  {formatCurrency(Math.max((goal.allocatedAmount || 0) - parseFloat((amount || '0').replace(/,/g, '').replace(/[^\d.]/g, '')), 0))}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Remove Funds</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
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
    flex: 1,
  },
  closeButton: {
    fontSize: 28,
    color: brandColors.textGray,
    paddingLeft: 10,
  },
  content: {
    padding: 20,
  },
  accountSelection: {
    marginBottom: 20,
  },
  accountButtons: {
    gap: 8,
  },
  accountButton: {
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  accountButtonSelected: {
    borderColor: brandColors.orangeAccent,
    backgroundColor: brandColors.orangeAccent + '10',
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  accountButtonTextSelected: {
    color: brandColors.orangeAccent,
  },
  allocatedBox: {
    backgroundColor: brandColors.orangeAccent + '15',
    borderWidth: 1,
    borderColor: brandColors.orangeAccent + '50',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  allocatedText: {
    color: brandColors.orangeAccent,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  returnToBox: {
    backgroundColor: brandColors.tealLight + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  returnToText: {
    color: brandColors.tealDark,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressInfo: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: brandColors.textGray,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    backgroundColor: brandColors.white,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 18,
    padding: 16,
    paddingLeft: 8,
    color: brandColors.textDark,
  },
  errorText: {
    color: brandColors.red,
    fontSize: 12,
    marginTop: 4,
  },
  previewBox: {
    backgroundColor: brandColors.orangeAccent + '15',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.orangeAccent,
  },
  previewAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.orangeAccent,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: brandColors.lightGray,
  },
  cancelButtonText: {
    color: brandColors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: brandColors.orangeAccent,
  },
  saveButtonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
