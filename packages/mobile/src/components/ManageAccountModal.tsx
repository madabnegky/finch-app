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

type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings';
  currentBalance: number;
  cushion?: number;
};

type ManageAccountModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  account?: Account | null; // If provided, edit mode; otherwise add mode
};

export const ManageAccountModal: React.FC<ManageAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
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
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an account name');
      return;
    }

    if (!balance || isNaN(parseFloat(balance))) {
      Alert.alert('Required', 'Please enter a valid balance');
      return;
    }

    const cushionValue = cushion ? parseFloat(cushion) : 0;
    if (cushion && (isNaN(cushionValue) || cushionValue < 0)) {
      Alert.alert('Invalid', 'Cushion must be a positive number');
      return;
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
        await firestore()
          .collection(`users/${user?.uid}/accounts`)
          .add(accountData);

        Alert.alert('Success', 'Account added successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      Alert.alert('Error', 'Failed to save account. Please try again.');
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
              {isEditMode ? 'Edit Account' : 'Add Account'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
});
