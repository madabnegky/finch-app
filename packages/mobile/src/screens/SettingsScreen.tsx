import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import brandColors from '../theme/colors';
import { navigationIcons, actionIcons, securityIcons, notificationIcons } from '../theme/icons';
import { deleteUserAccountAndData } from '../services/accountDeletionService';
import PrivacyPolicyScreen from '../legal/PrivacyPolicy';
import TermsOfServiceScreen from '../legal/TermsOfService';
import {
  getUserPreferences,
  updateUserPreferences,
  subscribeToUserPreferences
} from '../services/userPreferencesService';
import {
  isBiometricAvailable,
  getBiometricTypeName,
  BiometricType
} from '../services/biometricService';

/**
 * Settings Screen
 * - Modern design matching DashboardFinal
 * - Grouped settings sections
 * - Profile information at top
 * - Account management options
 */

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightComponent?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({
  icon,
  iconColor = brandColors.primary,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightComponent,
  danger = false,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIconContainer, danger && styles.settingIconContainerDanger]}>
        <Icon name={icon} size={22} color={danger ? brandColors.error : iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {rightComponent || (showChevron && (
        <Icon name={actionIcons.chevronRight} size={20} color={brandColors.textSecondary} />
      ))}
    </TouchableOpacity>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {children}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const { user, linkAccountWithEmail, linkAccountWithGoogle } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [transactionNotifications, setTransactionNotifications] = useState(true);
  const [paycheckNotifications, setPaycheckNotifications] = useState(true);
  const [morningSummaries, setMorningSummaries] = useState(true);
  const [dailyAlerts, setDailyAlerts] = useState(true);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  // Check biometric availability
  useEffect(() => {
    const checkBiometrics = async () => {
      const { available, biometryType } = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricType(biometryType);
    };
    checkBiometrics();
  }, []);

  // Load user preferences from Firestore
  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time preferences updates
    const unsubscribe = subscribeToUserPreferences((preferences) => {
      setNotificationsEnabled(preferences.notificationsEnabled);
      setTransactionNotifications(preferences.transactionNotifications);
      setPaycheckNotifications(preferences.paycheckNotifications);
      setMorningSummaries(preferences.morningSummaries);
      setDailyAlerts(preferences.dailyAlerts);
      setFaceIdEnabled(preferences.biometricAuthEnabled);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle notification toggle
  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);

    try {
      await updateUserPreferences({ notificationsEnabled: value });
      console.log('✅ Notification preference saved');
    } catch (error) {
      console.error('❌ Error saving notification preference:', error);
      // Revert on error
      setNotificationsEnabled(!value);
      Alert.alert('Error', 'Failed to save notification preference. Please try again.');
    }
  };

  // Handle transaction notifications toggle
  const handleTransactionNotificationsToggle = async (value: boolean) => {
    setTransactionNotifications(value);
    try {
      await updateUserPreferences({ transactionNotifications: value });
    } catch (error) {
      console.error('❌ Error saving transaction notifications preference:', error);
      setTransactionNotifications(!value);
      Alert.alert('Error', 'Failed to save preference. Please try again.');
    }
  };

  // Handle paycheck notifications toggle
  const handlePaycheckNotificationsToggle = async (value: boolean) => {
    setPaycheckNotifications(value);
    try {
      await updateUserPreferences({ paycheckNotifications: value });
    } catch (error) {
      console.error('❌ Error saving paycheck notifications preference:', error);
      setPaycheckNotifications(!value);
      Alert.alert('Error', 'Failed to save preference. Please try again.');
    }
  };

  // Handle morning summaries toggle
  const handleMorningSummariesToggle = async (value: boolean) => {
    setMorningSummaries(value);
    try {
      await updateUserPreferences({ morningSummaries: value });
    } catch (error) {
      console.error('❌ Error saving morning summaries preference:', error);
      setMorningSummaries(!value);
      Alert.alert('Error', 'Failed to save preference. Please try again.');
    }
  };

  // Handle daily alerts toggle
  const handleDailyAlertsToggle = async (value: boolean) => {
    setDailyAlerts(value);
    try {
      await updateUserPreferences({ dailyAlerts: value });
    } catch (error) {
      console.error('❌ Error saving daily alerts preference:', error);
      setDailyAlerts(!value);
      Alert.alert('Error', 'Failed to save preference. Please try again.');
    }
  };

  // Handle biometric toggle
  const handleBiometricToggle = async (value: boolean) => {
    setFaceIdEnabled(value);

    try {
      await updateUserPreferences({ biometricAuthEnabled: value });
      console.log('✅ Biometric preference saved');
    } catch (error) {
      console.error('❌ Error saving biometric preference:', error);
      // Revert on error
      setFaceIdEnabled(!value);
      Alert.alert('Error', 'Failed to save biometric preference. Please try again.');
    }
  };

  const handleConnectedAccounts = () => {
    navigation.navigate('ConnectedAccounts' as never);
  };

  const handleSecurity = () => {
    navigation.navigate('Security' as never);
  };

  const handlePrivacy = () => {
    setShowPrivacyPolicy(true);
  };

  const handleTermsOfService = () => {
    setShowTermsOfService(true);
  };


  const handleAbout = () => {
    Alert.alert('About Finch', 'Version 1.0.0\n\nFinch helps you manage your finances with confidence.');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            console.log('Signing out...');
            await auth().signOut();
            console.log('✅ Signed out successfully');
          } catch (error) {
            console.error('❌ Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }},
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete:\n\n• All your transactions and financial data\n• All budgets and goals\n• All bank account connections\n• Your account profile\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are You Absolutely Sure?',
              'This is your last chance. All your data will be permanently deleted and cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      console.log('Starting account deletion...');
                      await deleteUserAccountAndData();
                      console.log('✅ Account deleted successfully');
                      // User will be automatically signed out
                    } catch (error: any) {
                      console.error('❌ Delete account error:', error);
                      Alert.alert(
                        'Deletion Failed',
                        error.message || 'Failed to delete account. Please try again.',
                        [{ text: 'OK' }]
                      );
                    }
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  const handleLinkWithGoogle = async () => {
    try {
      console.log('Linking account with Google...');
      await linkAccountWithGoogle();
      Alert.alert('Success', 'Your account has been upgraded! Your data is now saved permanently.');
    } catch (error: any) {
      console.error('❌ Link with Google error:', error);
      Alert.alert('Error', error.message || 'Failed to link account. Please try again.');
    }
  };

  const handleLinkWithEmail = () => {
    Alert.prompt(
      'Create Account',
      'Enter your email and password to create a permanent account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: async (email, password) => {
          if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
          }
          try {
            console.log('Linking account with email...');
            await linkAccountWithEmail(email, password);
            Alert.alert('Success', 'Your account has been created! Your data is now saved permanently.');
          } catch (error: any) {
            console.error('❌ Link with email error:', error);
            Alert.alert('Error', error.message || 'Failed to create account. Please try again.');
          }
        }},
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={brandColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Icon name={navigationIcons.settings} size={24} color={brandColors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* CREATE ACCOUNT SECTION - Only show for guest users */}
        {user?.isAnonymous && (
          <SettingSection title="Upgrade Your Account">
            <SettingItem
              icon="google"
              iconColor="#EA4335"
              title="Sign in with Google"
              subtitle="Quick and secure"
              onPress={handleLinkWithGoogle}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="email"
              iconColor={brandColors.primary}
              title="Create with Email"
              subtitle="Use your email address"
              onPress={handleLinkWithEmail}
            />
          </SettingSection>
        )}

        {/* ACCOUNT SECTION */}
        <SettingSection title="Account">
          <SettingItem
            icon="bank"
            title="Connected Accounts"
            subtitle="Manage linked bank accounts"
            onPress={handleConnectedAccounts}
          />
        </SettingSection>

        {/* NOTIFICATIONS SECTION */}
        <SettingSection title="Notifications">
          <SettingItem
            icon={notificationIcons.bell}
            title="All Notifications"
            subtitle="Master toggle for all alerts"
            onPress={() => {}}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                thumbColor={notificationsEnabled ? brandColors.primary : brandColors.white}
              />
            }
            showChevron={false}
          />

          {notificationsEnabled && (
            <>
              <View style={styles.divider} />
              <SettingItem
                icon="credit-card"
                title="Transaction Alerts"
                subtitle="Real-time spending notifications (7:30 AM - 10 PM)"
                onPress={() => {}}
                rightComponent={
                  <Switch
                    value={transactionNotifications}
                    onValueChange={handleTransactionNotificationsToggle}
                    trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                    thumbColor={transactionNotifications ? brandColors.primary : brandColors.white}
                  />
                }
                showChevron={false}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="dollar-sign"
                title="Paycheck Notifications"
                subtitle="Get notified when income is deposited"
                onPress={() => {}}
                rightComponent={
                  <Switch
                    value={paycheckNotifications}
                    onValueChange={handlePaycheckNotificationsToggle}
                    trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                    thumbColor={paycheckNotifications ? brandColors.primary : brandColors.white}
                  />
                }
                showChevron={false}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="sunrise"
                title="Morning Summaries"
                subtitle="Daily 7:30 AM overnight transaction summary"
                onPress={() => {}}
                rightComponent={
                  <Switch
                    value={morningSummaries}
                    onValueChange={handleMorningSummariesToggle}
                    trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                    thumbColor={morningSummaries ? brandColors.primary : brandColors.white}
                  />
                }
                showChevron={false}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="alert-circle"
                title="Daily Alerts"
                subtitle="Daily 9 AM low balance and bill reminders"
                onPress={() => {}}
                rightComponent={
                  <Switch
                    value={dailyAlerts}
                    onValueChange={handleDailyAlertsToggle}
                    trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                    thumbColor={dailyAlerts ? brandColors.primary : brandColors.white}
                  />
                }
                showChevron={false}
              />
            </>
          )}
        </SettingSection>

        {/* SECURITY & PRIVACY SECTION */}
        <SettingSection title="Security & Privacy">
          <SettingItem
            icon={securityIcons.lock}
            title="Security"
            subtitle="Password & authentication"
            onPress={handleSecurity}
          />
          {biometricAvailable && (
            <>
              <View style={styles.divider} />
              <SettingItem
                icon={securityIcons.fingerprint}
                title={getBiometricTypeName(biometricType)}
                subtitle="Unlock app with biometrics"
                onPress={() => {}}
                rightComponent={
                  <Switch
                    value={faceIdEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: brandColors.border, true: brandColors.primaryLight }}
                    thumbColor={faceIdEnabled ? brandColors.primary : brandColors.white}
                  />
                }
                showChevron={false}
              />
            </>
          )}
          <View style={styles.divider} />
          <SettingItem
            icon={securityIcons.shield}
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={handlePrivacy}
          />
        </SettingSection>

        {/* LEGAL SECTION */}
        <SettingSection title="Legal">
          <SettingItem
            icon="file-document-outline"
            title="Terms of Service"
            subtitle="Our terms and conditions"
            onPress={handleTermsOfService}
          />
        </SettingSection>

        {/* SUPPORT SECTION */}
        <SettingSection title="About">
          <SettingItem
            icon="information-outline"
            title="About Finch"
            subtitle="Version 1.0.0"
            onPress={handleAbout}
          />
        </SettingSection>

        {/* ACCOUNT ACTIONS SECTION */}
        <SettingSection title="Account Actions">
          <SettingItem
            icon="logout"
            title="Sign Out"
            onPress={handleSignOut}
            danger
            showChevron={false}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="delete-forever"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
            danger
          />
        </SettingSection>

        {/* FOOTER SPACING */}
        <View style={styles.footerSpacing} />
      </ScrollView>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyPolicy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyPolicy(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyPolicy(false)}
            >
              <Icon name="close" size={24} color={brandColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <PrivacyPolicyScreen />
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsOfService}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsOfService(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTermsOfService(false)}
            >
              <Icon name="close" size={24} color={brandColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TermsOfServiceScreen />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },

  // Header
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
    backgroundColor: brandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: brandColors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: brandColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
    marginTop: 2,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brandColors.border,
  },

  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: brandColors.white,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: brandColors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIconContainerDanger: {
    backgroundColor: brandColors.error + '10',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textPrimary,
    marginBottom: 2,
  },
  settingTitleDanger: {
    color: brandColors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: brandColors.textSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: brandColors.border,
    marginLeft: 68, // Align with text after icon
  },

  // Footer
  footerSpacing: {
    height: 40,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
