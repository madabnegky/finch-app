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
import { validateAmount, validateAccountName } from '../utils/validation';
import { formatErrorForAlert } from '../utils/errorMessages';

type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings';
  currentBalance: number;
  cushion?: number;
  plaidAccountId?: string;
  plaidItemId?: string;
};

type ManageAccountModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onAccountCreated?: (accountId: string) => void; // Called with new account ID when created
  account?: Account | null; // If provided, edit mode; otherwise add mode
};

export const ManageAccountModal: React.FC<ManageAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onAccountCreated,
  account,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'savings'>('checking');
  const [balance, setBalance] = useState('');
  const [cushion, setCushion] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditMode = !!account;

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBalance(account.currentBalance.toString());
      setCushion(account.cushion?.toString() || '');
    } else {
      setName('');
      setType('checking');
      setBalance('');
      setCushion('');
    }
  }, [account, visible]);

  const handleSave = async () => {
    // Validate account name
    const nameValidation = validateAccountName(name);
    if (!nameValidation.isValid) {
      Alert.alert('Invalid Input', nameValidation.error || 'Please check the account name');
      return;
    }

    // Validate balance
    const balanceValidation = validateAmount(balance, {
      min: -999999999, // Allow negative for credit cards, overdrafts
      max: 999999999,
      allowNegative: true,
      fieldName: 'Balance',
    });
    if (!balanceValidation.isValid) {
      Alert.alert('Invalid Input', balanceValidation.error || 'Please check the balance');
      return;
    }

    // Validate cushion if provided
    const cushionValue = cushion ? parseFloat(cushion) : 0;
    if (cushion) {
      const cushionValidation = validateAmount(cushion, {
        min: 0,
        max: 99999,
        allowNegative: false,
        fieldName: 'Cushion',
      });
      if (!cushionValidation.isValid) {
        Alert.alert('Invalid Input', cushionValidation.error || 'Please check the cushion amount');
        return;
      }
    }

    try {
      setSaving(true);

      const accountData = {
        name: name.trim(),
        type,
        currentBalance: parseFloat(balance),
        cushion: cushionValue || 0,
        ...(isEditMode ? {} : { createdAt: firestore.FieldValue.serverTimestamp() }),
      };

      if (isEditMode && account) {
        // Update existing account
        await firestore()
          .collection(`users/${user?.uid}/accounts`)
          .doc(account.id)
          .update(accountData);

        Alert.alert('Success', 'Account updated successfully');
      } else {
        // Create new account
        const accountRef = await firestore()
          .collection(`users/${user?.uid}/accounts`)
          .add(accountData);

        // Check if this is the user's first non-demo account
        const accountsSnapshot = await firestore()
          .collection(`users/${user?.uid}/accounts`)
          .get();

        // Count non-demo accounts (accounts without isDemo or isDemo === false)
        const nonDemoAccounts = accountsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return !data.isDemo; // No isDemo field OR isDemo is false
        });

        const isFirstAccount = nonDemoAccounts.length === 1; // Just created, so should be 1

        console.log(`✅ Account created: ${accountRef.id}, total accounts: ${accountsSnapshot.size}, non-demo: ${nonDemoAccounts.length}, isFirstAccount: ${isFirstAccount}`);

        if (isFirstAccount && onAccountCreated) {
          // This is the first account! Trigger the congratulations flow
          onAccountCreated(accountRef.id);
        } else {
          // Not the first account, just show success message
          Alert.alert('Success', 'Account added successfully');
        }
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      const { title, message } = formatErrorForAlert(error);
      Alert.alert(title, message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              await firestore()
                .collection(`users/${user?.uid}/accounts`)
                .doc(account.id)
                .delete();

              Alert.alert('Success', 'Account deleted successfully');
              onSuccess?.();
              onClose();
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkFromPlaid = async () => {
    if (!account || !user) return;

    Alert.alert(
      'Unlink from Plaid',
      'This will stop automatic transaction syncing. Manual transactions will continue working. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              // Remove Plaid link from account
              await firestore()
                .collection(`users/${user.uid}/accounts`)
                .doc(account.id)
                .update({
                  plaidAccountId: firestore.FieldValue.delete(),
                  plaidItemId: firestore.FieldValue.delete(),
                  linkedAt: firestore.FieldValue.delete(),
                  lastPlaidBalance: firestore.FieldValue.delete(),
                  lastBalanceSyncAt: firestore.FieldValue.delete(),
                });

              Alert.alert('Success', 'Account unlinked from Plaid. Manual transactions will continue working.');
              onSuccess?.();
              onClose();
            } catch (error) {
              console.error('Unlink error:', error);
              Alert.alert('Error', 'Failed to unlink account. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
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
            <Text style={styles.title}>
              {isEditMode ? 'Edit Account' : 'Add Manual Account'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Show Plaid status if account is linked */}
            {isEditMode && account && account.plaidAccountId && (
              <View style={styles.plaidSection}>
                <View style={styles.plaidStatusContainer}>
                  <Text style={styles.plaidStatusText}>🔗 Linked to Plaid</Text>
                  <Text style={styles.plaidStatusSubtext}>
                    Transactions sync automatically
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unlinkButton}
                  onPress={handleUnlinkFromPlaid}
                  disabled={saving}
                >
                  <Text style={styles.unlinkButtonText}>Unlink from Plaid</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Chase Checking"
              placeholderTextColor={brandColors.textGray}
            />

            <Text style={styles.label}>Account Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  type === 'checking' && styles.segmentSelected,
                ]}
                onPress={() => setType('checking')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'checking' && styles.segmentTextSelected,
                  ]}
                >
                  Checking
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  type === 'savings' && styles.segmentSelected,
                ]}
                onPress={() => setType('savings')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    type === 'savings' && styles.segmentTextSelected,
                  ]}
                >
                  Savings
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Current Balance (USD)</Text>
            <TextInput
              style={styles.input}
              value={balance}
              onChangeText={setBalance}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={brandColors.textGray}
            />

            <Text style={styles.label}>Cushion / Safety Buffer (USD)</Text>
            <TextInput
              style={styles.input}
              value={cushion}
              onChangeText={setCushion}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={brandColors.textGray}
            />
            <Text style={styles.helperText}>
              Optional: Amount you want to keep as a safety buffer
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            {isEditMode && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={saving}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
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
              {saving && (
                <ActivityIndicator
                  size="small"
                  color={brandColors.white}
                  style={{ marginRight: 8 }}
                />
              )}
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
    padding: 20,
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
    backgroundColor: brandColors.tealPrimary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  segmentTextSelected: {
    color: brandColors.white,
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
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.red,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
  plaidSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  plaidStatusContainer: {
    marginBottom: 12,
  },
  plaidStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.tealDark,
    marginBottom: 4,
  },
  plaidStatusSubtext: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  unlinkButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: brandColors.white,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brandColors.amber,
  },
  unlinkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.amber,
  },
});
