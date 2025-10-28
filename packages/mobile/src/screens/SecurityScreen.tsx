import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';

type AuthProvider = {
  providerId: string;
  displayName: string;
  icon: string;
  color: string;
};

export function SecurityScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get authentication providers
  const getAuthProviders = (): AuthProvider[] => {
    const providers: AuthProvider[] = [];
    const currentUser = auth().currentUser;

    if (!currentUser) return providers;

    // Check for each provider type
    currentUser.providerData.forEach(profile => {
      if (profile.providerId === 'password') {
        providers.push({
          providerId: 'password',
          displayName: 'Email & Password',
          icon: 'email',
          color: brandColors.tealPrimary,
        });
      } else if (profile.providerId === 'google.com') {
        providers.push({
          providerId: 'google.com',
          displayName: 'Google',
          icon: 'google',
          color: '#EA4335',
        });
      }
    });

    // Check if anonymous
    if (currentUser.isAnonymous) {
      providers.push({
        providerId: 'anonymous',
        displayName: 'Guest Account',
        icon: 'account-circle-outline',
        color: brandColors.textLight,
      });
    }

    return providers;
  };

  const hasPasswordAuth = getAuthProviders().some(p => p.providerId === 'password');

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('No authenticated user found');
      }

      // Reauthenticate user
      const credential = auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await currentUser.reauthenticateWithCredential(credential);

      // Update password
      await currentUser.updatePassword(newPassword);

      console.log('✅ Password changed successfully');
      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowChangePassword(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error changing password:', error);

      let errorMessage = 'Failed to change password. Please try again.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please sign out and sign back in before changing your password.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
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
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Icon name="shield-lock" size={24} color={brandColors.tealPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Security</Text>
            <Text style={styles.headerSubtitle}>Password & authentication</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* AUTHENTICATION METHODS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Methods</Text>
          <View style={styles.card}>
            {getAuthProviders().map((provider, index) => (
              <View key={provider.providerId}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.providerRow}>
                  <View style={styles.providerLeft}>
                    <View style={[styles.providerIcon, { backgroundColor: `${provider.color}15` }]}>
                      <Icon name={provider.icon} size={20} color={provider.color} />
                    </View>
                    <Text style={styles.providerName}>{provider.displayName}</Text>
                  </View>
                  <View style={styles.activeBadge}>
                    <Icon name="check-circle" size={16} color={brandColors.green} />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PASSWORD MANAGEMENT */}
        {hasPasswordAuth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Password</Text>
            <View style={styles.card}>
              {!showChangePassword ? (
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => setShowChangePassword(true)}
                >
                  <View style={styles.actionLeft}>
                    <Icon name="lock-reset" size={20} color={brandColors.textDark} />
                    <Text style={styles.actionText}>Change Password</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={brandColors.textLight} />
                </TouchableOpacity>
              ) : (
                <View style={styles.passwordChangeForm}>
                  <Text style={styles.formTitle}>Change Password</Text>

                  {/* Current Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor={brandColors.textLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        <Icon
                          name={showCurrentPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={brandColors.textLight}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        placeholder="Enter new password"
                        placeholderTextColor={brandColors.textLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        <Icon
                          name={showNewPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={brandColors.textLight}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.inputHint}>At least 6 characters</Text>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        placeholder="Confirm new password"
                        placeholderTextColor={brandColors.textLight}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Icon
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={brandColors.textLight}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Buttons */}
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowChangePassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                      onPress={handleChangePassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={brandColors.white} />
                      ) : (
                        <Text style={styles.saveButtonText}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ACCOUNT INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {user?.email || user?.isAnonymous ? 'Guest Account' : 'Not set'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={[styles.infoValue, styles.infoValueMono]}>
                {user?.uid.slice(0, 16)}...
              </Text>
            </View>
          </View>
        </View>

        {/* SECURITY TIPS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Tips</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipRow}>
              <Icon name="check-circle" size={20} color={brandColors.green} />
              <Text style={styles.tipText}>Use a strong, unique password</Text>
            </View>
            <View style={styles.tipRow}>
              <Icon name="check-circle" size={20} color={brandColors.green} />
              <Text style={styles.tipText}>Never share your password with anyone</Text>
            </View>
            <View style={styles.tipRow}>
              <Icon name="check-circle" size={20} color={brandColors.green} />
              <Text style={styles.tipText}>Sign out on shared devices</Text>
            </View>
          </View>
        </View>

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
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  card: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.green,
  },
  divider: {
    height: 1,
    backgroundColor: brandColors.border,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  passwordChangeForm: {
    gap: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: brandColors.textDark,
  },
  eyeButton: {
    padding: 12,
  },
  inputHint: {
    fontSize: 13,
    color: brandColors.textLight,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: brandColors.backgroundOffWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: brandColors.textLight,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  infoValueMono: {
    fontFamily: 'Courier',
  },
  tipsCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: brandColors.textDark,
    lineHeight: 20,
  },
  footerSpacing: {
    height: 40,
  },
});
