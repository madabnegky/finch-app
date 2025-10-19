import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';

type NotificationSettings = {
  upcomingBills: boolean;
  budgetAlerts: boolean;
  weeklyReports: boolean;
};

export const SettingsScreen: React.FC = () => {
  const { user, linkAccountWithEmail, linkAccountWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    upcomingBills: true,
    budgetAlerts: true,
    weeklyReports: false,
  });
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [convertEmail, setConvertEmail] = useState('');
  const [convertPassword, setConvertPassword] = useState('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data?.notificationSettings) {
            setNotifications(data.notificationSettings);
          }
        }
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));

    try {
      setSaving(true);
      await firestore()
        .collection('users')
        .doc(user?.uid)
        .set(
          {
            notificationSettings: {
              ...notifications,
              [key]: newValue,
            },
          },
          { merge: true }
        );
    } catch (error) {
      console.error('Error updating settings:', error);
      // Revert on error
      setNotifications((prev) => ({ ...prev, [key]: !newValue }));
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await auth().signOut();
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user data from Firestore
              await firestore().collection('users').doc(user?.uid).delete();

              // Delete Firebase Auth user
              await auth().currentUser?.delete();

              Alert.alert('Success', 'Your account has been deleted');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. You may need to re-authenticate first.');
            }
          },
        },
      ]
    );
  };

  const handleConvertAccount = async () => {
    if (!convertEmail.trim() || !convertPassword.trim()) {
      Alert.alert('Required', 'Please enter both email and password');
      return;
    }

    if (convertPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    setConverting(true);

    try {
      await linkAccountWithEmail(convertEmail, convertPassword);
      Alert.alert('Success', 'Your demo account has been converted! All your data has been saved.');
      setConvertModalVisible(false);
      setConvertEmail('');
      setConvertPassword('');
    } catch (error: any) {
      console.error('Error converting account:', error);
      Alert.alert('Error', error.message || 'Failed to convert account. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const handleConvertWithGoogle = async () => {
    setConverting(true);

    try {
      await linkAccountWithGoogle();
      Alert.alert('Success', 'Your demo account has been converted with Google! All your data has been saved.');
      setConvertModalVisible(false);
    } catch (error: any) {
      console.error('Error converting account with Google:', error);
      Alert.alert('Error', error.message || 'Failed to convert account. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.settingValue}>{user?.email || 'Guest User (Demo Mode)'}</Text>
            </View>
          </View>

          {/* Convert Demo Account Button (only for anonymous users) */}
          {user?.isAnonymous && (
            <TouchableOpacity
              style={[styles.actionButton, styles.convertButton]}
              onPress={() => setConvertModalVisible(true)}
            >
              <Text style={[styles.actionButtonText, styles.convertButtonText]}>
                Convert Demo Account
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Upcoming Bills</Text>
              <Text style={styles.settingDescription}>
                Get notified 3 days before bills are due
              </Text>
            </View>
            <Switch
              value={notifications.upcomingBills}
              onValueChange={() => handleToggle('upcomingBills')}
              trackColor={{ false: brandColors.lightGray, true: brandColors.tealPrimary }}
              thumbColor={brandColors.white}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Budget Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified when you reach 80% of your budget
              </Text>
            </View>
            <Switch
              value={notifications.budgetAlerts}
              onValueChange={() => handleToggle('budgetAlerts')}
              trackColor={{ false: brandColors.lightGray, true: brandColors.tealPrimary }}
              thumbColor={brandColors.white}
              disabled={saving}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Weekly Reports</Text>
              <Text style={styles.settingDescription}>
                Get a weekly summary of your spending
              </Text>
            </View>
            <Switch
              value={notifications.weeklyReports}
              onValueChange={() => handleToggle('weeklyReports')}
              trackColor={{ false: brandColors.lightGray, true: brandColors.tealPrimary }}
              thumbColor={brandColors.white}
              disabled={saving}
            />
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Convert Account Modal */}
      <Modal
        visible={convertModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setConvertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Convert Demo Account</Text>
              <TouchableOpacity
                onPress={() => {
                  setConvertModalVisible(false);
                  setConvertEmail('');
                  setConvertPassword('');
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Create an account to save your demo data permanently. You'll be able to sign in on any device!
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="your@email.com"
                placeholderTextColor={brandColors.textGray}
                value={convertEmail}
                onChangeText={setConvertEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!converting}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="At least 6 characters"
                placeholderTextColor={brandColors.textGray}
                value={convertPassword}
                onChangeText={setConvertPassword}
                secureTextEntry
                textContentType="newPassword"
                editable={!converting}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, converting && styles.buttonDisabled]}
              onPress={handleConvertAccount}
              disabled={converting}
            >
              <Text style={styles.modalButtonText}>
                {converting ? 'Converting...' : 'Convert with Email'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalDivider}>
              <View style={styles.modalDividerLine} />
              <Text style={styles.modalDividerText}>OR</Text>
              <View style={styles.modalDividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalGoogleButton, converting && styles.buttonDisabled]}
              onPress={handleConvertWithGoogle}
              disabled={converting}
            >
              <Icon name="google" size={20} color={brandColors.textDark} style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>
                Convert with Google
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  settingDescription: {
    fontSize: 12,
    color: brandColors.textGray,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },
  dangerButton: {
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.red,
  },
  dangerButtonText: {
    color: brandColors.red,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },
  convertButton: {
    backgroundColor: brandColors.green,
    borderWidth: 0,
  },
  convertButtonText: {
    color: brandColors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 24,
    color: brandColors.textGray,
  },
  modalDescription: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    backgroundColor: brandColors.white,
  },
  modalButton: {
    flexDirection: 'row',
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: brandColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  modalDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brandColors.lightGray,
  },
  modalDividerText: {
    marginHorizontal: 16,
    color: brandColors.textGray,
    fontSize: 14,
  },
  modalGoogleButton: {
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
});
