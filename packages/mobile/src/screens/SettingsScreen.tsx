import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import brandColors from '../theme/colors';
import { navigationIcons, actionIcons, securityIcons, notificationIcons } from '../theme/icons';

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
  iconColor = brandColors.tealPrimary,
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
        <Icon name={actionIcons.chevronRight} size={20} color={brandColors.textGray} />
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
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);

  const handleConnectedAccounts = () => {
    Alert.alert('Connected Accounts', 'Manage your linked bank accounts');
  };

  const handleNotificationSettings = () => {
    Alert.alert('Notifications', 'Manage your notification preferences');
  };

  const handleSecurity = () => {
    Alert.alert('Security', 'Manage your security settings');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy', 'Manage your privacy settings');
  };

  const handleDataExport = () => {
    Alert.alert('Export Data', 'Download a copy of your financial data');
  };

  const handleSupport = () => {
    Alert.alert('Help & Support', 'Get help with Finch');
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
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const currentUser = auth().currentUser;
            if (currentUser) {
              console.log('Deleting account...');
              await currentUser.delete();
              console.log('✅ Account deleted successfully');
            }
          } catch (error) {
            console.error('❌ Delete account error:', error);
            Alert.alert(
              'Error',
              'Failed to delete account. You may need to sign in again to perform this action.',
              [{ text: 'OK' }]
            );
          }
        }},
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
          <Icon name="arrow-left" size={24} color={brandColors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Icon name={navigationIcons.settings} size={24} color={brandColors.tealPrimary} />
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
              iconColor={brandColors.tealPrimary}
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
          <View style={styles.divider} />
          <SettingItem
            icon={notificationIcons.bell}
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={handleNotificationSettings}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: brandColors.border, true: brandColors.tealLight }}
                thumbColor={notificationsEnabled ? brandColors.tealPrimary : brandColors.white}
              />
            }
            showChevron={false}
          />
        </SettingSection>

        {/* SECURITY & PRIVACY SECTION */}
        <SettingSection title="Security & Privacy">
          <SettingItem
            icon={securityIcons.lock}
            title="Security"
            subtitle="Password & authentication"
            onPress={handleSecurity}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={securityIcons.fingerprint}
            title="Face ID / Touch ID"
            subtitle="Unlock with biometrics"
            onPress={() => {}}
            rightComponent={
              <Switch
                value={faceIdEnabled}
                onValueChange={setFaceIdEnabled}
                trackColor={{ false: brandColors.border, true: brandColors.tealLight }}
                thumbColor={faceIdEnabled ? brandColors.tealPrimary : brandColors.white}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={securityIcons.shield}
            title="Privacy"
            subtitle="Control your data"
            onPress={handlePrivacy}
          />
        </SettingSection>

        {/* DATA SECTION */}
        <SettingSection title="Data">
          <SettingItem
            icon="download"
            title="Export Data"
            subtitle="Download your financial data"
            onPress={handleDataExport}
          />
        </SettingSection>

        {/* SUPPORT SECTION */}
        <SettingSection title="Support">
          <SettingItem
            icon="lifebuoy"
            title="Help & Support"
            subtitle="Get help with Finch"
            onPress={handleSupport}
          />
          <View style={styles.divider} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
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
    backgroundColor: brandColors.backgroundOffWhite,
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
    backgroundColor: brandColors.tealPrimary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
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
    fontWeight: '700',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    backgroundColor: brandColors.tealPrimary + '10',
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
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  settingTitleDanger: {
    color: brandColors.error,
  },
  settingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
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
});
