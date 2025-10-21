// packages/mobile/src/components/PlaidAccountPicker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';

type PlaidAccount = {
  plaidAccountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
};

type AccountSelection = {
  plaidAccountId: string;
  account: PlaidAccount;
  cushion: number;
};

type PlaidAccountPickerProps = {
  visible: boolean;
  institutionName: string;
  plaidAccounts: PlaidAccount[];
  onSelect: (selectedAccounts: AccountSelection[]) => void;
  onCancel: () => void;
};

export const PlaidAccountPicker: React.FC<PlaidAccountPickerProps> = ({
  visible,
  institutionName,
  plaidAccounts,
  onSelect,
  onCancel,
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [cushions, setCushions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountIcon = (type: string, subtype: string) => {
    if (subtype === 'checking') return 'bank';
    if (subtype === 'savings') return 'piggy-bank';
    if (subtype === 'credit card' || type === 'credit') return 'credit-card';
    return 'bank';
  };

  const isAccountSupported = (account: PlaidAccount) => {
    return account.subtype === 'checking' || account.subtype === 'savings';
  };

  const toggleAccountSelection = (accountId: string) => {
    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
      // Clear cushion for deselected account
      const newCushions = { ...cushions };
      delete newCushions[accountId];
      setCushions(newCushions);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccounts(newSelection);
  };

  const handleCushionChange = (accountId: string, value: string) => {
    setCushions({
      ...cushions,
      [accountId]: value,
    });
  };

  const handleConfirm = () => {
    if (selectedAccounts.size === 0) {
      return;
    }

    setSaving(true);

    // Build the selections array
    const selections: AccountSelection[] = Array.from(selectedAccounts).map(accountId => {
      const account = plaidAccounts.find(acc => acc.plaidAccountId === accountId)!;
      const cushionValue = parseFloat(cushions[accountId] || '0');

      return {
        plaidAccountId: accountId,
        account,
        cushion: isNaN(cushionValue) ? 0 : cushionValue,
      };
    });

    onSelect(selections);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={brandColors.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Select Accounts</Text>
            <Text style={styles.subtitle}>{institutionName}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.instruction}>
            Select which accounts to add to Finch. You can choose multiple accounts and set a cushion (safety buffer) for each.
          </Text>

          {plaidAccounts.map((account) => {
            const isSelected = selectedAccounts.has(account.plaidAccountId);
            const isSupported = isAccountSupported(account);

            return (
              <View key={account.plaidAccountId} style={styles.accountCardContainer}>
                <TouchableOpacity
                  style={[
                    styles.accountCard,
                    isSelected && styles.accountCardSelected,
                    !isSupported && styles.accountCardDisabled,
                  ]}
                  onPress={() => isSupported && toggleAccountSelection(account.plaidAccountId)}
                  disabled={!isSupported}
                >
                  <View style={styles.accountCardHeader}>
                    <View style={styles.accountIcon}>
                      <Icon
                        name={getAccountIcon(account.type, account.subtype)}
                        size={32}
                        color={isSupported ? brandColors.tealPrimary : brandColors.textGray}
                      />
                    </View>

                    <View style={styles.accountInfo}>
                      <Text style={[styles.accountName, !isSupported && styles.accountNameDisabled]}>
                        {account.name || account.officialName}
                      </Text>
                      <Text style={styles.accountType}>
                        {account.subtype?.charAt(0).toUpperCase() + account.subtype?.slice(1) || 'Account'}
                        {account.mask && ` ••${account.mask}`}
                      </Text>
                      {!isSupported && (
                        <Text style={styles.unsupportedText}>
                          Account type not supported
                        </Text>
                      )}
                      <Text style={styles.accountBalance}>
                        {formatCurrency(account.currentBalance)}
                      </Text>
                    </View>

                    <View style={styles.checkbox}>
                      {isSupported ? (
                        isSelected ? (
                          <Icon name="checkbox-marked" size={28} color={brandColors.tealPrimary} />
                        ) : (
                          <Icon name="checkbox-blank-outline" size={28} color={brandColors.textGray} />
                        )
                      ) : (
                        <Icon name="alert-circle-outline" size={28} color={brandColors.textGray} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Cushion Input - only show when account is selected */}
                {isSelected && (
                  <View style={styles.cushionContainer}>
                    <Text style={styles.cushionLabel}>Cushion / Safety Buffer (USD):</Text>
                    <TextInput
                      style={styles.cushionInput}
                      value={cushions[account.plaidAccountId] || ''}
                      onChangeText={(value) => handleCushionChange(account.plaidAccountId, value)}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor={brandColors.textGray}
                    />
                    <Text style={styles.cushionHelper}>
                      Amount you want to keep as a safety buffer
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (selectedAccounts.size === 0 || saving) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedAccounts.size === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={brandColors.white} />
            ) : (
              <Text style={styles.confirmButtonText}>
                Add {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: brandColors.textGray,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instruction: {
    fontSize: 14,
    color: brandColors.textDark,
    marginBottom: 20,
    lineHeight: 20,
  },
  accountCardContainer: {
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: brandColors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accountCardSelected: {
    borderColor: brandColors.tealPrimary,
    backgroundColor: brandColors.tealLight + '15',
  },
  accountCardDisabled: {
    opacity: 0.5,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.tealLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  accountNameDisabled: {
    color: brandColors.textGray,
  },
  accountType: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 4,
  },
  unsupportedText: {
    fontSize: 12,
    color: brandColors.red,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: brandColors.tealDark,
  },
  checkbox: {
    marginLeft: 12,
  },
  cushionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: brandColors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.tealPrimary + '40',
  },
  cushionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  cushionInput: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    backgroundColor: brandColors.white,
    marginBottom: 6,
  },
  cushionHelper: {
    fontSize: 12,
    color: brandColors.textGray,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: brandColors.white,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    flexDirection: 'row',
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
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
