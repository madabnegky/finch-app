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
import { brandColors } from '../theme/colors';

type Account = {
  id: string;
  name: string;
  type: string;
};

type WhatIfModalProps = {
  visible: boolean;
  onClose: () => void;
  onSimulate: (transaction: any) => void;
  currentAvailableToSpend: number;
  projection60DayLow: number;
  protectionDays: number;
};

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  visible,
  onClose,
  onSimulate,
  currentAvailableToSpend,
  projection60DayLow,
  protectionDays,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Calculate impact in real-time
  // Remove commas and other formatting characters before parsing (parseFloat stops at commas, so "1,000" becomes 1)
  const cleanAmount = amount.replace(/,/g, '').replace(/[^\d.]/g, '');
  const purchaseAmount = parseFloat(cleanAmount) || 0;
  const newAvailableToSpend = currentAvailableToSpend - purchaseAmount;
  const newProjection60DayLow = projection60DayLow - purchaseAmount;

  // Determine impact severity
  const getImpactSeverity = () => {
    if (purchaseAmount === 0) return 'none';
    if (newAvailableToSpend < 0 && currentAvailableToSpend >= 0) return 'critical'; // Going negative
    if (newAvailableToSpend < -500) return 'critical'; // Deep in the red
    if (newAvailableToSpend < 0) return 'warning'; // Negative but manageable
    if (newAvailableToSpend < 100) return 'caution'; // Getting close
    return 'safe';
  };

  const impactSeverity = getImpactSeverity();

  // Get smart message based on impact
  const getSmartMessage = () => {
    if (purchaseAmount === 0) return null;

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    switch (impactSeverity) {
      case 'critical':
        if (currentAvailableToSpend >= 0 && newAvailableToSpend < 0) {
          return {
            icon: '🚨',
            message: `This would put you ${formatCurrency(Math.abs(newAvailableToSpend))} over budget. Consider waiting until your next paycheck.`,
            color: brandColors.error,
          };
        }
        return {
          icon: '🚨',
          message: `This would put you ${formatCurrency(Math.abs(newAvailableToSpend))} in the red. This purchase may cause financial stress.`,
          color: brandColors.error,
        };
      case 'warning':
        return {
          icon: '⚠️',
          message: `You'll be ${formatCurrency(Math.abs(newAvailableToSpend))} over budget, but upcoming bills are covered.`,
          color: brandColors.orangeAccent,
        };
      case 'caution':
        return {
          icon: '⚡',
          message: `You'll have ${formatCurrency(newAvailableToSpend)} left. Be careful with additional spending.`,
          color: brandColors.orangeAccent,
        };
      case 'safe':
        return {
          icon: '✅',
          message: `You can afford this! You'll still have ${formatCurrency(newAvailableToSpend)} available.`,
          color: brandColors.success,
        };
      default:
        return null;
    }
  };

  const smartMessage = getSmartMessage();

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

    // Clean amount before parsing
    const cleanAmountForValidation = amount.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!amount || isNaN(parseFloat(cleanAmountForValidation))) {
      return;
    }

    // Convert date string to Date object in local timezone
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
    parsedDate.setHours(0, 0, 0, 0);

    const simulationTransaction = {
      id: `whatif-${Date.now()}`,
      description: description.trim(),
      amount: -Math.abs(parseFloat(cleanAmountForValidation)), // Always expense
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
            <Text style={styles.title}>💭 Test a Purchase</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              See if you can afford a purchase today without impacting your financial safety.
            </Text>

            <Text style={styles.label}>How much do you want to spend?</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor={brandColors.textGray}
                autoFocus={true}
              />
            </View>

            <Text style={styles.label}>What's it for? (optional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Dinner out, Car repair, New shoes"
              placeholderTextColor={brandColors.textGray}
            />

            {/* Real-time Impact Display */}
            {purchaseAmount > 0 && (
              <View style={styles.impactSection}>
                <Text style={styles.impactTitle}>📊 Financial Impact</Text>

                <View style={styles.impactRow}>
                  <View style={styles.impactItem}>
                    <Text style={styles.impactLabel}>Current Available</Text>
                    <Text style={styles.impactValue}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentAvailableToSpend)}
                    </Text>
                  </View>
                  <Text style={styles.impactArrow}>→</Text>
                  <View style={styles.impactItem}>
                    <Text style={styles.impactLabel}>After Purchase</Text>
                    <Text style={[
                      styles.impactValue,
                      { color: newAvailableToSpend < 0 ? brandColors.error : brandColors.success }
                    ]}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(newAvailableToSpend)}
                    </Text>
                  </View>
                </View>

                <View style={styles.impactStats}>
                  <View style={styles.impactStat}>
                    <Text style={styles.impactStatLabel}>60-Day Low</Text>
                    <Text style={[
                      styles.impactStatValue,
                      { color: newProjection60DayLow < 0 ? brandColors.error : brandColors.textDark }
                    ]}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(newProjection60DayLow)}
                    </Text>
                  </View>
                </View>

                {/* Smart Message */}
                {smartMessage && (
                  <View style={[styles.smartMessageCard, { borderLeftColor: smartMessage.color }]}>
                    <Text style={styles.smartMessageIcon}>{smartMessage.icon}</Text>
                    <Text style={styles.smartMessageText}>{smartMessage.message}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeOnlyButton}
              onPress={onClose}
            >
              <Text style={styles.closeOnlyButtonText}>Got it</Text>
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brandColors.tealPrimary,
    borderRadius: 12,
    padding: 16,
    backgroundColor: brandColors.white,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: brandColors.tealPrimary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: brandColors.textDark,
    padding: 0,
  },
  impactSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    gap: 16,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  impactItem: {
    flex: 1,
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
  },
  impactArrow: {
    fontSize: 20,
    color: brandColors.textGray,
  },
  impactStats: {
    flexDirection: 'row',
    gap: 12,
  },
  impactStat: {
    flex: 1,
    padding: 12,
    backgroundColor: brandColors.white,
    borderRadius: 8,
    alignItems: 'center',
  },
  impactStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 4,
  },
  impactStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  smartMessageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: brandColors.white,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  smartMessageIcon: {
    fontSize: 20,
  },
  smartMessageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  closeOnlyButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
  },
  closeOnlyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
