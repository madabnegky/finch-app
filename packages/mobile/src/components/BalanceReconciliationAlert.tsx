import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import brandColors from '../theme/colors';

interface BalanceReconciliationAlertProps {
  visible: boolean;
  accountName: string;
  oldBalance: number;
  newBalance: number;
  onDismiss: () => void;
}

export const BalanceReconciliationAlert: React.FC<BalanceReconciliationAlertProps> = ({
  visible,
  accountName,
  oldBalance,
  newBalance,
  onDismiss,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const difference = newBalance - oldBalance;
  const isIncrease = difference > 0;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🏦</Text>
          </View>

          <Text style={styles.title}>Balance Updated</Text>

          <Text style={styles.message}>
            Your <Text style={styles.bold}>{accountName}</Text> balance has been updated to match
            your bank account.
          </Text>

          <View style={styles.balanceComparison}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Previous Balance:</Text>
              <Text style={styles.balanceValueOld}>{formatCurrency(oldBalance)}</Text>
            </View>

            <View style={styles.arrow}>
              <Text style={styles.arrowText}>↓</Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Bank Balance:</Text>
              <Text style={styles.balanceValueNew}>{formatCurrency(newBalance)}</Text>
            </View>

            <View style={styles.differenceBox}>
              <Text
                style={[
                  styles.differenceText,
                  isIncrease ? styles.differencePositive : styles.differenceNegative,
                ]}
              >
                {isIncrease ? '+' : ''}
                {formatCurrency(difference)}
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              All future projections will use your actual bank balance for accurate cash flow
              forecasting.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: brandColors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: brandColors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  bold: {
    fontWeight: '600',
    color: brandColors.text.primary,
  },
  balanceComparison: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: brandColors.text.secondary,
  },
  balanceValueOld: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  balanceValueNew: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.primary,
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 24,
    color: brandColors.primary,
  },
  differenceBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  differenceText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  differencePositive: {
    color: '#10B981',
  },
  differenceNegative: {
    color: '#EF4444',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: brandColors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  button: {
    backgroundColor: brandColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
