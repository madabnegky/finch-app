import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';

interface FirstAccountCongratsProps {
  visible: boolean;
  accountName: string;
  onAddTransactions: () => void;
  onSkip: () => void;
}

export const FirstAccountCongrats: React.FC<FirstAccountCongratsProps> = ({
  visible,
  accountName,
  onAddTransactions,
  onSkip,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Celebration Icon */}
            <View style={styles.iconContainer}>
              <Icon name="party-popper" size={80} color={brandColors.orangeAccent} />
            </View>

            {/* Congratulations Title */}
            <Text style={styles.title}>Account Added!</Text>

            {/* Account Name */}
            <View style={styles.accountBadge}>
              <Icon name="check-circle" size={20} color={brandColors.success} />
              <Text style={styles.accountName}>{accountName}</Text>
            </View>

            {/* Message */}
            <Text style={styles.message}>
              Great start! Now let's add your recurring income and bills so Finch can help you plan ahead.
            </Text>

            {/* Why It Matters */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: brandColors.success + '15' }]}>
                  <Icon name="cash-plus" size={24} color={brandColors.success} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Track Income</Text>
                  <Text style={styles.benefitDescription}>
                    Add your paycheck and other regular income
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: brandColors.error + '15' }]}>
                  <Icon name="calendar-clock" size={24} color={brandColors.error} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>Plan for Bills</Text>
                  <Text style={styles.benefitDescription}>
                    Add rent, utilities, subscriptions, and more
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIcon, { backgroundColor: brandColors.tealPrimary + '15' }]}>
                  <Icon name="chart-line" size={24} color={brandColors.tealPrimary} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>See Your Future</Text>
                  <Text style={styles.benefitDescription}>
                    Finch predicts your balance 60 days ahead
                  </Text>
                </View>
              </View>
            </View>

            {/* Primary Action */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onAddTransactions}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Add Recurring Transactions</Text>
              <Icon name="arrow-right" size={20} color={brandColors.white} />
            </TouchableOpacity>

            {/* Secondary Action */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>I'll do this later</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: brandColors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: brandColors.textDark,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brandColors.success + '10',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.success,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  benefitsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 28,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brandColors.orangeAccent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    shadowColor: brandColors.orangeAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textGray,
  },
});
