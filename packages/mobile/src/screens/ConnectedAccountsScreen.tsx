import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';
import { accountIcons } from '../theme/icons';
import { ManageAccountModal } from '../components/ManageAccountModal';
import { PlaidAccountPicker } from '../components/PlaidAccountPicker';
import { usePlaidLink } from '../components/PlaidLinkHandler';
import { formatCurrency } from '../utils/formatters';

type Account = {
  id: string;
  name: string;
  type: 'checking' | 'savings';
  currentBalance: number;
  cushion?: number;
  plaidAccountId?: string;
  plaidItemId?: string;
  plaidAccessToken?: string;
  lastSynced?: any;
  isPrimary?: boolean;
};

export function ConnectedAccountsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [showPlaidPicker, setShowPlaidPicker] = useState(false);

  // Plaid link handler
  const { openPlaidLink, isPlaidLinkLoading } = usePlaidLink({
    onSuccess: () => {
      console.log('✅ Plaid link successful, refreshing accounts...');
      loadAccounts();
    },
    onExit: (error) => {
      if (error) {
        console.error('❌ Plaid link error:', error);
      }
    },
  });

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const accountsSnapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('accounts')
        .orderBy('isPrimary', 'desc')
        .orderBy('name', 'asc')
        .get();

      const accountsData = accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Account[];

      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      Alert.alert('Error', 'Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

  const handleAddManualAccount = () => {
    setAccountToEdit(null);
    setShowManageAccount(true);
  };

  const handleAddPlaidAccount = () => {
    openPlaidLink();
  };

  const handleEditAccount = (account: Account) => {
    setAccountToEdit(account);
    setShowManageAccount(true);
  };

  const handleSetPrimary = async (accountId: string) => {
    if (!user) return;

    try {
      const batch = firestore().batch();

      // Remove isPrimary from all accounts
      accounts.forEach(account => {
        const ref = firestore()
          .collection('users')
          .doc(user.uid)
          .collection('accounts')
          .doc(account.id);
        batch.update(ref, { isPrimary: false });
      });

      // Set this account as primary
      const primaryRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('accounts')
        .doc(accountId);
      batch.update(primaryRef, { isPrimary: true });

      await batch.commit();
      console.log('✅ Primary account updated');
      loadAccounts();
    } catch (error) {
      console.error('Error setting primary account:', error);
      Alert.alert('Error', 'Failed to set primary account. Please try again.');
    }
  };

  const manualAccounts = accounts.filter(a => !a.plaidAccountId);
  const plaidAccounts = accounts.filter(a => a.plaidAccountId);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={brandColors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Icon name="bank" size={24} color={brandColors.tealPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Connected Accounts</Text>
            <Text style={styles.headerSubtitle}>
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColors.tealPrimary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={brandColors.tealPrimary}
            />
          }
        >
          {/* ADD ACCOUNT SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add New Account</Text>
            <View style={styles.addButtonsContainer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPlaidAccount}
                disabled={isPlaidLinkLoading}
              >
                <View style={[styles.addButtonIcon, { backgroundColor: '#2ECC71' }]}>
                  <Icon name="link-variant" size={24} color={brandColors.white} />
                </View>
                <View style={styles.addButtonText}>
                  <Text style={styles.addButtonTitle}>Connect with Plaid</Text>
                  <Text style={styles.addButtonSubtitle}>Automatic sync</Text>
                </View>
                <Icon name="chevron-right" size={24} color={brandColors.textLight} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddManualAccount}
              >
                <View style={[styles.addButtonIcon, { backgroundColor: brandColors.tealPrimary }]}>
                  <Icon name="plus" size={24} color={brandColors.white} />
                </View>
                <View style={styles.addButtonText}>
                  <Text style={styles.addButtonTitle}>Add Manually</Text>
                  <Text style={styles.addButtonSubtitle}>Track yourself</Text>
                </View>
                <Icon name="chevron-right" size={24} color={brandColors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* PLAID ACCOUNTS SECTION */}
          {plaidAccounts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bank Connected</Text>
                <View style={styles.badge}>
                  <Icon name="sync" size={12} color={brandColors.white} />
                  <Text style={styles.badgeText}>Auto-sync</Text>
                </View>
              </View>

              {plaidAccounts.map((account, index) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountCard,
                    index === 0 && styles.accountCardFirst,
                  ]}
                  onPress={() => handleEditAccount(account)}
                  activeOpacity={0.7}
                >
                  <View style={styles.accountCardLeft}>
                    <View style={[
                      styles.accountIcon,
                      { backgroundColor: brandColors.tealLight }
                    ]}>
                      <Icon
                        name={accountIcons[account.type] || 'bank'}
                        size={20}
                        color={brandColors.tealPrimary}
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <View style={styles.accountNameRow}>
                        <Text style={styles.accountName}>{account.name}</Text>
                        {account.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.accountMetaRow}>
                        <Icon name="link-variant" size={12} color={brandColors.green} />
                        <Text style={styles.accountMeta}>
                          Synced{' '}
                          {account.lastSynced
                            ? new Date(account.lastSynced.toDate()).toLocaleDateString()
                            : 'recently'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.accountCardRight}>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(account.currentBalance)}
                    </Text>
                    <Icon name="chevron-right" size={20} color={brandColors.textLight} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* MANUAL ACCOUNTS SECTION */}
          {manualAccounts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Manual Accounts</Text>
                <View style={[styles.badge, { backgroundColor: brandColors.orangeAccent }]}>
                  <Icon name="pencil" size={12} color={brandColors.white} />
                  <Text style={styles.badgeText}>Manual</Text>
                </View>
              </View>

              {manualAccounts.map((account, index) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountCard,
                    index === 0 && styles.accountCardFirst,
                  ]}
                  onPress={() => handleEditAccount(account)}
                  activeOpacity={0.7}
                >
                  <View style={styles.accountCardLeft}>
                    <View style={[
                      styles.accountIcon,
                      { backgroundColor: brandColors.orangeLight }
                    ]}>
                      <Icon
                        name={accountIcons[account.type] || 'bank'}
                        size={20}
                        color={brandColors.orangeAccent}
                      />
                    </View>
                    <View style={styles.accountInfo}>
                      <View style={styles.accountNameRow}>
                        <Text style={styles.accountName}>{account.name}</Text>
                        {account.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.accountType}>
                        {account.type === 'checking' ? 'Checking' : 'Savings'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountCardRight}>
                    <Text style={styles.accountBalance}>
                      {formatCurrency(account.currentBalance)}
                    </Text>
                    <Icon name="chevron-right" size={20} color={brandColors.textLight} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* EMPTY STATE */}
          {accounts.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="bank-off-outline" size={64} color={brandColors.textLight} />
              <Text style={styles.emptyStateTitle}>No Accounts Yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first account to start tracking your finances
              </Text>
            </View>
          )}

          <View style={styles.footerSpacing} />
        </ScrollView>
      )}

      {/* MANAGE ACCOUNT MODAL */}
      <ManageAccountModal
        visible={showManageAccount}
        onClose={() => {
          setShowManageAccount(false);
          setAccountToEdit(null);
        }}
        onSuccess={() => {
          setShowManageAccount(false);
          setAccountToEdit(null);
          loadAccounts();
        }}
        account={accountToEdit}
      />

      {/* PLAID ACCOUNT PICKER MODAL */}
      <PlaidAccountPicker
        visible={showPlaidPicker}
        onClose={() => setShowPlaidPicker(false)}
        onAccountsLinked={() => {
          setShowPlaidPicker(false);
          loadAccounts();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    backgroundColor: brandColors.white,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.backgroundOffWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: brandColors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: brandColors.textLight,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brandColors.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.white,
  },
  addButtonsContainer: {
    gap: 12,
  },
  addButton: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  addButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    flex: 1,
  },
  addButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  addButtonSubtitle: {
    fontSize: 14,
    color: brandColors.textLight,
    marginTop: 2,
  },
  accountCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: brandColors.border,
    marginTop: 12,
  },
  accountCardFirst: {
    marginTop: 0,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  primaryBadge: {
    backgroundColor: brandColors.tealLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },
  accountMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  accountMeta: {
    fontSize: 13,
    color: brandColors.textLight,
  },
  accountType: {
    fontSize: 14,
    color: brandColors.textLight,
    marginTop: 4,
  },
  accountCardRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 15,
    color: brandColors.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  footerSpacing: {
    height: 40,
  },
});
