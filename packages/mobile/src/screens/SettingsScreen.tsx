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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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

type NotificationSettings = {
  upcomingBills: boolean;
  budgetAlerts: boolean;
  weeklyReports: boolean;
};

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    upcomingBills: true,
    budgetAlerts: true,
    weeklyReports: false,
  });

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primaryBlue} />
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
              <Text style={styles.settingValue}>{user?.email || 'Guest User'}</Text>
            </View>
          </View>
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
              trackColor={{ false: brandColors.lightGray, true: brandColors.primaryBlue }}
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
              trackColor={{ false: brandColors.lightGray, true: brandColors.primaryBlue }}
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
              trackColor={{ false: brandColors.lightGray, true: brandColors.primaryBlue }}
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
    color: brandColors.primaryBlue,
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
});
