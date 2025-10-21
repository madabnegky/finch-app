import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import brandColors from '../theme/colors';

interface PlaidAccount {
  plaidAccountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
}

interface PlaidAccountPickerProps {
  visible: boolean;
  institutionName: string;
  plaidAccounts: PlaidAccount[];
  manualAccountName: string;
  manualAccountBalance: number;
  onSelect: (plaidAccountId: string, selectedAccount: PlaidAccount) => void;
  onCancel: () => void;
}

export const PlaidAccountPicker: React.FC<PlaidAccountPickerProps> = ({
  visible,
  institutionName,
  plaidAccounts,
  manualAccountName,
  manualAccountBalance,
  onSelect,
  onCancel,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    plaidAccounts[0]?.plaidAccountId || ''
  );

  const selectedAccount = plaidAccounts.find(acc => acc.plaidAccountId === selectedAccountId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Bank Account</Text>
            <Text style={styles.subtitle}>
              From {institutionName}
            </Text>
          </View>

          <ScrollView style={styles.accountList}>
            <Text style={styles.instructionText}>
              Select the account from <Text style={styles.bold}>{institutionName}</Text> that
              corresponds to your "{manualAccountName}" account:
            </Text>

            {plaidAccounts.map((account) => (
              <TouchableOpacity
                key={account.plaidAccountId}
                style={[
                  styles.accountCard,
                  selectedAccountId === account.plaidAccountId && styles.accountCardSelected,
                ]}
                onPress={() => setSelectedAccountId(account.plaidAccountId)}
              >
                <View style={styles.accountHeader}>
                  <Text style={styles.accountName}>
                    {account.name || account.officialName}
                  </Text>
                  {account.mask && (
                    <Text style={styles.accountMask}>••••{account.mask}</Text>
                  )}
                </View>
                <Text style={styles.accountType}>
                  {account.subtype} {account.type}
                </Text>
                <Text style={styles.accountBalance}>
                  {formatCurrency(account.currentBalance)}
                </Text>
                {selectedAccountId === account.plaidAccountId && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedAccount && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Balance Update</Text>
              <Text style={styles.warningText}>
                Your manual balance ({formatCurrency(manualAccountBalance)}) will be updated to
                match your bank balance ({formatCurrency(selectedAccount.currentBalance)}).
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                if (selectedAccount) {
                  onSelect(selectedAccountId, selectedAccount);
                }
              }}
              disabled={!selectedAccount}
            >
              <Text style={styles.confirmButtonText}>Confirm Link</Text>
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
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: brandColors.textGray,
    marginTop: 4,
  },
  accountList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instructionText: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 16,
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  accountCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  accountCardSelected: {
    borderColor: brandColors.tealPrimary,
    backgroundColor: '#F0F9FF',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    flex: 1,
  },
  accountMask: {
    fontSize: 14,
    color: brandColors.textGray,
    fontFamily: 'monospace',
  },
  accountType: {
    fontSize: 13,
    color: brandColors.textGray,
    marginBottom: 8,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.tealPrimary,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: brandColors.tealPrimary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
