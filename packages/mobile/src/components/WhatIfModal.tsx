import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  purple: '#9333EA',
};

type Account = {
  id: string;
  name: string;
  type: string;
};

type WhatIfModalProps = {
  visible: boolean;
  onClose: () => void;
  onSimulate: (transaction: any) => void;
};

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  visible,
  onClose,
  onSimulate,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Set default date to today
  useEffect(() => {
    if (visible && !date) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
    }
  }, [visible]);

  // Fetch accounts
  useEffect(() => {
    if (!user || !visible) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot((snapshot) => {
        const accountsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          type: doc.data().type,
        }));
        setAccounts(accountsList);

        // Set default account
        if (accountsList.length > 0 && !accountId) {
          setAccountId(accountsList[0].id);
        }
      });

    return () => unsubscribe();
  }, [user, visible]);

  const handleSimulate = () => {
    if (!description.trim()) {
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return;
    }

    // Convert date string to Date object in local timezone
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
    parsedDate.setHours(0, 0, 0, 0);

    const simulationTransaction = {
      id: `whatif-${Date.now()}`,
      description: description.trim(),
      amount: -Math.abs(parseFloat(amount)), // Always expense
      date: parsedDate,
      accountId: accountId || (accounts[0]?.id || ''),
      type: 'expense' as const,
      isRecurring: false,
      isWhatIf: true, // Flag to identify what-if transactions
    };

    onSimulate(simulationTransaction);

    // Reset and close
    setDescription('');
    setAmount('');
    onClose();
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
            <Text style={styles.title}>"What If?" Scenario</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              See how a potential purchase could impact your future balance. This won't be saved
              as a real transaction.
            </Text>

            <Text style={styles.label}>Purchase Description</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., New TV, Car repair"
              placeholderTextColor={brandColors.textGray}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Amount (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={brandColors.textGray}
                />
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>Account</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      // For now, just cycle through accounts
                      const currentIndex = accounts.findIndex(a => a.id === accountId);
                      const nextIndex = (currentIndex + 1) % accounts.length;
                      if (accounts[nextIndex]) {
                        setAccountId(accounts[nextIndex].id);
                      }
                    }}
                  >
                    <Text style={styles.pickerText}>
                      {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Purchase Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={brandColors.textGray}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.simulateButton,
                (!description.trim() || !amount) && styles.simulateButtonDisabled,
              ]}
              onPress={handleSimulate}
              disabled={!description.trim() || !amount}
            >
              <Text style={styles.simulateButtonText}>Run Simulation</Text>
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
    maxHeight: '80%',
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
  description: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 12,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    backgroundColor: brandColors.white,
  },
  pickerButton: {
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: brandColors.textDark,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  simulateButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.purple,
    alignItems: 'center',
  },
  simulateButtonDisabled: {
    opacity: 0.5,
  },
  simulateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
