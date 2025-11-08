/**
 * Premium Status Card
 * Shows subscription status and countdown for trial/premium users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { differenceInDays, format } from 'date-fns';
import brandColors from '../theme/colors';
import type { SubscriptionData } from '../services/subscriptionService';

interface PremiumStatusCardProps {
  userId: string;
  onUpgrade?: () => void;
}

export const PremiumStatusCard: React.FC<PremiumStatusCardProps> = ({
  userId,
  onUpgrade,
}) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('subscription')
      .doc('current')
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() as SubscriptionData;
            setSubscription(data);

            // Calculate days remaining
            if (data.tier === 'premium') {
              let endDate: Date | null = null;

              if (data.status === 'trial' && data.trialEndsAt) {
                endDate = data.trialEndsAt.toDate();
              } else if (
                (data.status === 'active' || data.status === 'cancelled') &&
                data.currentPeriodEnd
              ) {
                endDate = data.currentPeriodEnd.toDate();
              }

              if (endDate) {
                const days = differenceInDays(endDate, new Date());
                setDaysRemaining(Math.max(0, days));
              } else {
                setDaysRemaining(null);
              }
            } else {
              setDaysRemaining(null);
            }
          } else {
            // No subscription data - user is on free tier
            setSubscription({
              tier: 'free',
              status: 'none',
            });
            setDaysRemaining(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching subscription:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={brandColors.primary} />
      </View>
    );
  }

  // Free tier
  if (!subscription || subscription.tier === 'free') {
    return (
      <TouchableOpacity
        style={[styles.card, styles.freeCard]}
        onPress={onUpgrade}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Icon name="crown-outline" size={28} color={brandColors.textGray} />
        </View>
        <View style={styles.content}>
          <Text style={styles.freeTierTitle}>Free Plan</Text>
          <Text style={styles.freeTierSubtitle}>
            Upgrade to unlock all premium features
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={brandColors.textGray} />
      </TouchableOpacity>
    );
  }

  // Premium tier
  const isPremium = subscription.tier === 'premium';
  const isTrial = subscription.status === 'trial';
  const isCancelled = subscription.status === 'cancelled';

  const getStatusColor = () => {
    if (isCancelled) return brandColors.warning;
    if (isTrial) return brandColors.tealPrimary;
    return brandColors.success;
  };

  const getStatusIcon = () => {
    if (isCancelled) return 'alert-circle';
    if (isTrial) return 'gift';
    return 'crown';
  };

  const getStatusText = () => {
    if (isCancelled) return 'Premium (Cancelled)';
    if (isTrial) return 'Premium Trial';
    return 'Premium';
  };

  const getSubtitleText = () => {
    if (daysRemaining === null) {
      return 'Active subscription';
    }

    if (daysRemaining === 0) {
      return isTrial ? 'Trial ends today' : 'Renews today';
    }

    if (daysRemaining === 1) {
      return isTrial
        ? 'Trial ends tomorrow'
        : isCancelled
        ? 'Access ends tomorrow'
        : 'Renews tomorrow';
    }

    if (isTrial) {
      return `${daysRemaining} days left in trial`;
    }

    if (isCancelled) {
      return `${daysRemaining} days of access remaining`;
    }

    return `Renews in ${daysRemaining} days`;
  };

  const getEndDate = () => {
    if (!daysRemaining && !subscription.currentPeriodEnd && !subscription.trialEndsAt) {
      return null;
    }

    const endDate = isTrial
      ? subscription.trialEndsAt?.toDate()
      : subscription.currentPeriodEnd?.toDate();

    if (!endDate) return null;

    return format(endDate, 'MMM d, yyyy');
  };

  const statusColor = getStatusColor();
  const endDateStr = getEndDate();

  return (
    <View style={[styles.card, styles.premiumCard, { borderColor: statusColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
        <Icon name={getStatusIcon()} size={28} color={statusColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusTitle, { color: statusColor }]}>
            {getStatusText()}
          </Text>
          {isCancelled && (
            <TouchableOpacity style={styles.reactivateButton} onPress={onUpgrade}>
              <Text style={styles.reactivateButtonText}>Reactivate</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.statusSubtitle}>{getSubtitleText()}</Text>
        {endDateStr && (
          <Text style={styles.endDate}>
            {isTrial ? 'Ends' : isCancelled ? 'Until' : 'Next billing'}: {endDateStr}
          </Text>
        )}
      </View>
      {daysRemaining !== null && (
        <View style={styles.countdownBadge}>
          <Text style={[styles.countdownNumber, { color: statusColor }]}>
            {daysRemaining}
          </Text>
          <Text style={styles.countdownLabel}>days</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: brandColors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  freeCard: {
    borderStyle: 'dashed',
  },
  premiumCard: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: brandColors.backgroundOffWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  freeTierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  freeTierSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  endDate: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  countdownBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 10,
    marginLeft: 12,
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reactivateButton: {
    backgroundColor: brandColors.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reactivateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.white,
  },
});
