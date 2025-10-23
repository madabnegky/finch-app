import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { clearDemoData } from '../services/demoDataService';
import auth from '@react-native-firebase/auth';

interface AccountSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaidSelected: () => void;
  onManualSelected: () => void;
}

export const AccountSetupModal: React.FC<AccountSetupModalProps> = ({
  visible,
  onClose,
  onPlaidSelected,
  onManualSelected,
}) => {
  const { user } = useAuth();
  const [converting, setConverting] = useState(false);

  const handleConvertToRealUser = async (onSuccess: () => void) => {
    if (!user?.isAnonymous) {
      onSuccess();
      return;
    }

    try {
      setConverting(true);

      // Clear all demo data first
      console.log('🧹 Clearing demo data for user:', user.uid);
      await clearDemoData(user.uid);

      // Note: For now, we keep the anonymous user and just clear their demo data
      // In a future iteration, we could prompt them to sign up with email/password
      // or social login to convert the anonymous account to a permanent account

      console.log('✅ Demo data cleared, user ready for real accounts');
      setConverting(false);
      onSuccess();
    } catch (error) {
      console.error('Error converting user:', error);
      Alert.alert('Error', 'Failed to prepare your account. Please try again.');
      setConverting(false);
    }
  };

  const handlePlaidClick = () => {
    handleConvertToRealUser(() => {
      onClose();
      onPlaidSelected();
    });
  };

  const handleManualClick = () => {
    handleConvertToRealUser(() => {
      onClose();
      onManualSelected();
    });
  };

  if (converting) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={brandColors.tealPrimary} />
            <Text style={styles.loadingText}>Preparing your account...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Get Started with Finch</Text>
                <Text style={styles.subtitle}>
                  Choose how you'd like to add your first account
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
            </View>

            {/* Recommended Badge */}
            <View style={styles.recommendedBadge}>
              <Icon name="star" size={16} color={brandColors.orangeAccent} />
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>

            {/* Plaid Option */}
            <TouchableOpacity
              style={[styles.optionCard, styles.recommendedCard]}
              onPress={handlePlaidClick}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <View style={[styles.optionIcon, { backgroundColor: brandColors.tealPrimary + '15' }]}>
                  <Icon name="bank-plus" size={32} color={brandColors.tealPrimary} />
                </View>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Connect Bank with Plaid</Text>
                <Text style={styles.optionDescription}>
                  Securely link your bank account in seconds. Automatic transaction sync and balance updates.
                </Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color={brandColors.success} />
                    <Text style={styles.benefitText}>Fast & secure connection</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color={brandColors.success} />
                    <Text style={styles.benefitText}>Automatic transaction sync</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="check-circle" size={16} color={brandColors.success} />
                    <Text style={styles.benefitText}>Real-time balance updates</Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={brandColors.textGray} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual Option */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={handleManualClick}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconContainer}>
                <View style={[styles.optionIcon, { backgroundColor: brandColors.orangeAccent + '15' }]}>
                  <Icon name="pencil" size={32} color={brandColors.orangeAccent} />
                </View>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Manually</Text>
                <Text style={styles.optionDescription}>
                  Enter your account details yourself. You'll also set up your recurring transactions.
                </Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <Icon name="information-outline" size={16} color={brandColors.textGray} />
                    <Text style={styles.benefitText}>Manual transaction entry</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="information-outline" size={16} color={brandColors.textGray} />
                    <Text style={styles.benefitText}>Set up recurring transactions</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Icon name="information-outline" size={16} color={brandColors.textGray} />
                    <Text style={styles.benefitText}>More control over your data</Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={brandColors.textGray} />
            </TouchableOpacity>

            {/* Keep Exploring Button */}
            <TouchableOpacity
              style={styles.keepExploringButton}
              onPress={onClose}
            >
              <Text style={styles.keepExploringText}>Keep Exploring Demo</Text>
            </TouchableOpacity>

            {/* Footer Note */}
            <View style={styles.footer}>
              <Icon name="shield-check" size={20} color={brandColors.success} />
              <Text style={styles.footerText}>
                Your demo data will be automatically cleared when you add your first real account
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  loadingContainer: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brandColors.orangeAccent + '15',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.orangeAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionCard: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recommendedCard: {
    borderColor: brandColors.orangeAccent,
    backgroundColor: brandColors.orangeAccent + '05',
  },
  optionIconContainer: {
    marginTop: 4,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 20,
    marginBottom: 8,
  },
  benefitsList: {
    gap: 6,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brandColors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  keepExploringButton: {
    borderWidth: 2,
    borderColor: brandColors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  keepExploringText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: brandColors.success + '10',
    padding: 16,
    borderRadius: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textDark,
    lineHeight: 18,
  },
});
