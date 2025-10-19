import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';

type Account = {
  id: string;
  name: string;
  currentBalance: number;
};

type TransferModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !visible) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot((snapshot) => {
        const accountsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          currentBalance: doc.data().currentBalance || 0,
        }));
        setAccounts(accountsData);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user, visible]);

  const handleTransfer = async () => {
    if (!fromAccountId) {
      Alert.alert('Required', 'Please select a source account');
      return;
    }

    if (!toAccountId) {
      Alert.alert('Required', 'Please select a destination account');
      return;
    }

    if (fromAccountId === toAccountId) {
      Alert.alert('Invalid', 'Source and destination accounts must be different');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid transfer amount');
      return;
    }

    const transferAmount = parseFloat(amount);
    const fromAccount = accounts.find((a) => a.id === fromAccountId);

    if (!fromAccount) {
      Alert.alert('Error', 'Source account not found');
      return;
    }

    if (fromAccount.currentBalance < transferAmount) {
      Alert.alert(
        'Insufficient Funds',
        `Source account only has $${fromAccount.currentBalance.toFixed(2)} available`
      );
      return;
    }

    try {
      setSaving(true);

      const batch = firestore().batch();

      // Update from account (subtract)
      const fromRef = firestore()
        .collection(`users/${user?.uid}/accounts`)
        .doc(fromAccountId);
      batch.update(fromRef, {
        currentBalance: firestore.FieldValue.increment(-transferAmount),
      });

      // Update to account (add)
      const toRef = firestore()
        .collection(`users/${user?.uid}/accounts`)
        .doc(toAccountId);
      batch.update(toRef, {
        currentBalance: firestore.FieldValue.increment(transferAmount),
      });

      // Create transfer record
      const transferRef = firestore()
        .collection(`users/${user?.uid}/transfers`)
        .doc();
      batch.set(transferRef, {
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        note: note.trim() || '',
        date: firestore.Timestamp.now(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      // Reset form
      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setNote('');

      Alert.alert('Success', 'Transfer completed successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error performing transfer:', error);
      Alert.alert('Error', 'Failed to complete transfer. Please try again.');
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
            <Text style={styles.title}>Transfer Between Accounts</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={brandColors.tealPrimary} />
            </View>
          ) : (
            <>
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {accounts.length < 2 ? (
                  <Text style={styles.warningText}>
                    You need at least 2 accounts to perform a transfer
                  </Text>
                ) : (
                  <>
                    <Text style={styles.label}>From Account</Text>
                    <View style={styles.accountSelector}>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountButton,
                            fromAccountId === account.id && styles.accountButtonSelected,
                            toAccountId === account.id && styles.accountButtonDisabled,
                          ]}
                          onPress={() => setFromAccountId(account.id)}
                          disabled={toAccountId === account.id}
                        >
                          <Text
                            style={[
                              styles.accountButtonText,
                              fromAccountId === account.id && styles.accountButtonTextSelected,
                              toAccountId === account.id && styles.accountButtonTextDisabled,
                            ]}
                          >
                            {account.name}
                          </Text>
                          <Text
                            style={[
                              styles.accountBalance,
                              fromAccountId === account.id && styles.accountBalanceSelected,
                            ]}
                          >
                            ${account.currentBalance.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>To Account</Text>
                    <View style={styles.accountSelector}>
                      {accounts.map((account) => (
                        <TouchableOpacity
                          key={account.id}
                          style={[
                            styles.accountButton,
                            toAccountId === account.id && styles.accountButtonSelected,
                            fromAccountId === account.id && styles.accountButtonDisabled,
                          ]}
                          onPress={() => setToAccountId(account.id)}
                          disabled={fromAccountId === account.id}
                        >
                          <Text
                            style={[
                              styles.accountButtonText,
                              toAccountId === account.id && styles.accountButtonTextSelected,
                              fromAccountId === account.id && styles.accountButtonTextDisabled,
                            ]}
                          >
                            {account.name}
                          </Text>
                          <Text
                            style={[
                              styles.accountBalance,
                              toAccountId === account.id && styles.accountBalanceSelected,
                            ]}
                          >
                            ${account.currentBalance.toFixed(2)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Amount (USD)</Text>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor={brandColors.textGray}
                    />

                    <Text style={styles.label}>Note (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={note}
                      onChangeText={setNote}
                      placeholder="e.g., Moving to savings"
                      placeholderTextColor={brandColors.textGray}
                    />
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
                  style={[
                    styles.saveButton,
                    (saving || accounts.length < 2) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleTransfer}
                  disabled={saving || accounts.length < 2}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Transferring...' : 'Transfer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  accountSelector: {
    gap: 8,
  },
  accountButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountButtonSelected: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  accountButtonDisabled: {
    opacity: 0.4,
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  accountButtonTextSelected: {
    color: brandColors.white,
  },
  accountButtonTextDisabled: {
    color: brandColors.textGray,
  },
  accountBalance: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  accountBalanceSelected: {
    color: brandColors.white,
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
  warningText: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    paddingVertical: 40,
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
    backgroundColor: brandColors.tealPrimary,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
