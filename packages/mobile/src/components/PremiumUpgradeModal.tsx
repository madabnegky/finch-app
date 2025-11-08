/**
 * Premium Upgrade Modal
 * Shows when users try to access premium features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import {
  startFreeTrial,
  getSubscriptionOfferings,
  purchasePackage
} from '../services/subscriptionService';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string; // The feature that triggered the modal
}

export const PremiumUpgradeModal: React.FC<PremiumUpgradeModalProps> = ({
  visible,
  onClose,
  feature,
}) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  // Load offerings when modal opens
  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    try {
      const offers = await getSubscriptionOfferings();
      setOfferings(offers);
    } catch (error) {
      console.error('Error loading offerings:', error);
    }
  };

  const handleStartTrial = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await startFreeTrial(user.uid);
      Alert.alert(
        'Trial Started! 🎉',
        'You now have 30 days of free premium access. Enjoy all features!',
        [{ text: 'Get Started', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error starting trial:', error);
      Alert.alert('Error', 'Failed to start trial. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;

    if (!offerings) {
      Alert.alert('Error', 'Subscription packages not available. Please try again.');
      return;
    }

    try {
      setLoading(true);

      // Get the selected package from RevenueCat offerings
      let packageToPurchase: PurchasesPackage | null = null;

      if (selectedPlan === 'yearly' && offerings.annual) {
        packageToPurchase = offerings.annual;
      } else if (selectedPlan === 'monthly' && offerings.monthly) {
        packageToPurchase = offerings.monthly;
      }

      if (!packageToPurchase) {
        Alert.alert('Error', 'Selected plan not available');
        setLoading(false);
        return;
      }

      // Purchase through RevenueCat
      await purchasePackage(user.uid, packageToPurchase);

      Alert.alert(
        'Welcome to Premium! 🎉',
        'Your subscription is now active. Enjoy all premium features!',
        [{ text: 'Get Started', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('Error subscribing:', error);
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const allFeatures = [
    { icon: 'bank', name: 'Plaid Bank Linking', description: 'Auto-sync transactions from your bank accounts' },
    { icon: 'wallet-plus', name: 'Unlimited Accounts', description: 'Track as many accounts as you need' },
    { icon: 'chart-timeline-variant', name: '60-Day Projections', description: 'Extended financial forecasting' },
    { icon: 'heart-pulse', name: 'Financial Health Score', description: 'Track your financial wellness over time' },
    { icon: 'target', name: 'Unlimited Goals', description: 'Save for multiple goals simultaneously' },
    { icon: 'chart-box', name: 'Budget Tracking', description: 'Set budgets and track spending by category' },
    { icon: 'file-export', name: 'CSV Export', description: 'Export your data for analysis' },
    { icon: 'bell-ring', name: 'Smart Alerts', description: 'Predictive notifications about your finances' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={brandColors.textGray} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.premiumBadge}>
                <Icon name="crown" size={32} color={brandColors.warning} />
              </View>
              <Text style={styles.title}>Upgrade to Premium</Text>
              <Text style={styles.subtitle}>
                {feature
                  ? `Unlock ${feature} and all premium features`
                  : 'Unlock powerful features to take control of your finances'}
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              {allFeatures.map((feat, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIconContainer}>
                    <Icon name={feat.icon} size={20} color={brandColors.tealPrimary} />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureName}>{feat.name}</Text>
                    <Text style={styles.featureDescription}>{feat.description}</Text>
                  </View>
                  <Icon name="check-circle" size={20} color={brandColors.success} />
                </View>
              ))}
            </View>

            {/* Trial CTA */}
            <TouchableOpacity
              style={styles.trialButton}
              onPress={handleStartTrial}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={brandColors.white} />
              ) : (
                <>
                  <Icon name="gift" size={20} color={brandColors.white} />
                  <Text style={styles.trialButtonText}>
                    Start 30-Day Free Trial
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or subscribe now</Text>
              <View style={styles.orLine} />
            </View>

            {/* Pricing Plans */}
            <View style={styles.pricingContainer}>
              {/* Yearly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'yearly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('yearly')}
                disabled={loading}
              >
                <View style={styles.planHeader}>
                  <View>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planName}>Yearly</Text>
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>Save 17%</Text>
                      </View>
                    </View>
                    <Text style={styles.planPrice}>$49.99/year</Text>
                    <Text style={styles.planDetail}>Just $4.17/month</Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedPlan === 'yearly' && styles.radioButtonSelected,
                  ]}>
                    {selectedPlan === 'yearly' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Monthly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                disabled={loading}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>Monthly</Text>
                    <Text style={styles.planPrice}>$4.99/month</Text>
                    <Text style={styles.planDetail}>Billed monthly</Text>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedPlan === 'monthly' && styles.radioButtonSelected,
                  ]}>
                    {selectedPlan === 'monthly' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Subscribe Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={brandColors.white} />
              ) : (
                <>
                  <Text style={styles.upgradeButtonText}>
                    Subscribe to Premium
                  </Text>
                  <Icon name="arrow-right" size={20} color={brandColors.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                • Cancel anytime{'\n'}
                • 7-day money-back guarantee{'\n'}
                • Secure payment processing
              </Text>
            </View>

            {/* Testing Note (only in dev) */}
            {__DEV__ && (
              <View style={styles.devNote}>
                <Icon name="information" size={16} color={brandColors.warning} />
                <Text style={styles.devNoteText}>
                  Dev Mode: Auto-premium enabled for testing
                </Text>
              </View>
            )}
          </ScrollView>
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
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brandColors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    marginBottom: 8,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brandColors.tealPrimary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 18,
  },
  pricingContainer: {
    marginBottom: 24,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    backgroundColor: brandColors.tealPrimary + '10',
    borderColor: brandColors.tealPrimary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  savingsBadge: {
    backgroundColor: brandColors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.white,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: brandColors.tealPrimary,
    marginBottom: 2,
  },
  planDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: brandColors.tealPrimary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: brandColors.tealPrimary,
  },
  trialButton: {
    backgroundColor: brandColors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: brandColors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trialButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: brandColors.white,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: brandColors.border,
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
    marginHorizontal: 16,
  },
  upgradeButton: {
    backgroundColor: brandColors.tealPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: brandColors.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: brandColors.white,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  devNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: brandColors.warning + '20',
    borderRadius: 8,
    marginTop: 8,
  },
  devNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.warning,
  },
});
