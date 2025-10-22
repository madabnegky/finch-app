// CONCEPT 1: "Hero Card" Design
// - Large, prominent Available to Spend display
// - Account switcher with swipeable cards
// - Clean, modern with gradient accents
// - Finch logo integrated in header

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import { accountIcons, actionIcons, specialIcons } from '../theme/icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DashboardConcept1 = () => {
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  // Mock data for visualization
  const accounts = [
    { id: '1', name: 'Chase Checking', type: 'checking', availableToSpend: 1847.32, balance: 2500, cushion: 500 },
    { id: '2', name: 'Savings', type: 'savings', availableToSpend: 5200.00, balance: 6000, cushion: 800 },
    { id: '3', name: 'Credit Card', type: 'credit', availableToSpend: 850.00, balance: -150, cushion: 0 },
  ];

  const upcomingBills = [
    { name: 'Rent', amount: 1200, date: 'Oct 28', icon: 'home' },
    { name: 'Electric Bill', amount: 85, date: 'Oct 30', icon: 'lightning-bolt' },
    { name: 'Internet', amount: 60, date: 'Nov 2', icon: 'wifi' },
  ];

  const selectedAccount = accounts[selectedAccountIndex];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <View style={styles.container}>
      {/* HEADER with integrated Finch branding */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.brandContainer}>
            <View style={styles.logoCircle}>
              <Icon name={specialIcons.finch} size={24} color={brandColors.white} />
            </View>
            <View>
              <Text style={styles.brandName}>Finch</Text>
              <Text style={styles.brandTagline}>Financial Clarity</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell-outline" size={24} color={brandColors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO: Available to Spend Card */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            {/* Gradient background effect simulated with layered views */}
            <View style={styles.heroGradient} />

            <View style={styles.heroContent}>
              <Text style={styles.heroLabel}>AVAILABLE TO SPEND</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(selectedAccount.availableToSpend)}
              </Text>
              <Text style={styles.heroAccount}>{selectedAccount.name}</Text>

              {/* Account Switcher Pills */}
              <View style={styles.accountSwitcher}>
                {accounts.map((account, index) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountPill,
                      index === selectedAccountIndex && styles.accountPillActive
                    ]}
                    onPress={() => setSelectedAccountIndex(index)}
                  >
                    <Icon
                      name={accountIcons[account.type as keyof typeof accountIcons]}
                      size={16}
                      color={index === selectedAccountIndex ? brandColors.white : brandColors.tealDark}
                    />
                    <Text style={[
                      styles.accountPillText,
                      index === selectedAccountIndex && styles.accountPillTextActive
                    ]}>
                      {account.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Balance Breakdown */}
              <View style={styles.balanceBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Total Balance</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(selectedAccount.balance)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Safety Cushion</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(selectedAccount.cushion)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: brandColors.orangeAccent + '20' }]}>
                <Icon name="plus" size={24} color={brandColors.orangeAccent} />
              </View>
              <Text style={styles.actionText}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: brandColors.tealLight + '20' }]}>
                <Icon name="flag-variant" size={24} color={brandColors.tealPrimary} />
              </View>
              <Text style={styles.actionText}>Save to Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Icon name="lightbulb-on" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>What If?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* UPCOMING BILLS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {upcomingBills.map((bill, index) => (
            <View key={index} style={styles.billCard}>
              <View style={styles.billLeft}>
                <View style={[styles.billIcon, { backgroundColor: brandColors.error + '15' }]}>
                  <Icon name={bill.icon} size={20} color={brandColors.error} />
                </View>
                <View>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billDate}>Due {bill.date}</Text>
                </View>
              </View>
              <Text style={styles.billAmount}>-{formatCurrency(bill.amount)}</Text>
            </View>
          ))}
        </View>

        {/* SAFETY NET INDICATOR */}
        <View style={styles.section}>
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Icon name="shield-check" size={24} color={brandColors.success} />
              <Text style={styles.safetyTitle}>Financial Safety Net</Text>
            </View>
            <Text style={styles.safetyDescription}>
              Your cushion of {formatCurrency(selectedAccount.cushion)} protects you from unexpected expenses.
            </Text>
            <View style={styles.safetyBar}>
              <View style={[styles.safetyBarFill, { width: '75%' }]} />
            </View>
            <Text style={styles.safetyLabel}>You're protected for ~15 days</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },

  // Header
  header: {
    backgroundColor: brandColors.tealDark,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.orangeAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.white,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '500',
    color: brandColors.white + 'CC',
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 8,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: brandColors.tealPrimary,
    // Simulate gradient with opacity layers
  },
  heroContent: {
    padding: 28,
    backgroundColor: brandColors.tealPrimary,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.white,
    opacity: 0.8,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroAmount: {
    fontSize: 56,
    fontWeight: '800',
    color: brandColors.white,
    letterSpacing: -2,
    marginBottom: 8,
  },
  heroAccount: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
    opacity: 0.9,
    marginBottom: 24,
  },

  // Account Switcher
  accountSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: brandColors.white + '30',
  },
  accountPillActive: {
    backgroundColor: brandColors.orangeAccent,
  },
  accountPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.tealDark,
  },
  accountPillTextActive: {
    color: brandColors.white,
  },

  // Balance Breakdown
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.white + '15',
    borderRadius: 12,
    padding: 16,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.white,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.white,
  },
  breakdownDivider: {
    width: 1,
    height: '100%',
    backgroundColor: brandColors.white + '30',
    marginHorizontal: 16,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textDark,
    textAlign: 'center',
  },

  // Bills
  billCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  billDate: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.error,
  },

  // Safety Card
  safetyCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  safetyDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 20,
    marginBottom: 16,
  },
  safetyBar: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  safetyBarFill: {
    height: '100%',
    backgroundColor: brandColors.success,
    borderRadius: 4,
  },
  safetyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.success,
  },
});
