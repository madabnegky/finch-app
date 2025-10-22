// CONCEPT 3: "Card Stack" Design
// - Compact, efficient information density
// - Stacked card design for modern feel
// - Primary account spotlight at top
// - Quick-glance financial health indicators
// - Professional with subtle orange accent pops

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import { accountIcons, actionIcons, specialIcons } from '../theme/icons';

export const DashboardConcept3 = () => {
  const [selectedAccountId, setSelectedAccountId] = useState('1');

  // Mock data
  const accounts = [
    { id: '1', name: 'Chase Checking', type: 'checking', availableToSpend: 1847.32, balance: 2500, cushion: 500 },
    { id: '2', name: 'Savings', type: 'savings', availableToSpend: 5200.00, balance: 6000, cushion: 800 },
    { id: '3', name: 'Credit Card', type: 'credit', availableToSpend: 850.00, balance: -150, cushion: 0 },
  ];

  const upcomingTransactions = [
    { name: 'Rent Payment', amount: -1200, date: 'Oct 28', type: 'expense', icon: 'home' },
    { name: 'Freelance Income', amount: 850, date: 'Oct 29', type: 'income', icon: 'cash-plus' },
    { name: 'Electric Bill', amount: -85, date: 'Oct 30', type: 'expense', icon: 'lightning-bolt' },
  ];

  const goals = [
    { name: 'Emergency Fund', saved: 2400, target: 5000, color: brandColors.success },
    { name: 'Vacation', saved: 650, target: 2000, color: brandColors.orangeAccent },
  ];

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const totalAvailable = accounts.reduce((sum, acc) => sum + acc.availableToSpend, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount));
  };

  return (
    <View style={styles.container}>
      {/* COMPACT HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Icon name={specialIcons.finch} size={20} color={brandColors.white} />
            </View>
            <View>
              <Text style={styles.greeting}>Good afternoon</Text>
              <Text style={styles.username}>Kyle</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="cog-outline" size={24} color={brandColors.white} />
          </TouchableOpacity>
        </View>

        {/* Total Available - Compact */}
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>TOTAL AVAILABLE ACROSS ALL ACCOUNTS</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalAvailable)}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* PRIMARY ACCOUNT SPOTLIGHT */}
        <View style={styles.section}>
          <View style={styles.spotlightCard}>
            {/* Account Selector */}
            <View style={styles.accountSelector}>
              <Text style={styles.selectorLabel}>Primary Account</Text>
              <TouchableOpacity style={styles.selectorButton}>
                <Icon name={accountIcons[selectedAccount.type as keyof typeof accountIcons]} size={18} color={brandColors.tealPrimary} />
                <Text style={styles.selectorText}>{selectedAccount.name}</Text>
                <Icon name="chevron-down" size={18} color={brandColors.tealPrimary} />
              </TouchableOpacity>
            </View>

            {/* Available to Spend - Hero Number */}
            <View style={styles.spotlightAmount}>
              <Text style={styles.spotlightLabel}>Available to Spend</Text>
              <Text style={styles.spotlightValue}>{formatCurrency(selectedAccount.availableToSpend)}</Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Balance</Text>
                <Text style={styles.statValue}>{formatCurrency(selectedAccount.balance)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cushion</Text>
                <Text style={styles.statValue}>{formatCurrency(selectedAccount.cushion)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Goals</Text>
                <Text style={styles.statValue}>{formatCurrency(152.68)}</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionButton}>
                <Icon name="plus" size={18} color={brandColors.white} />
                <Text style={styles.quickActionText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionButton, styles.quickActionButtonSecondary]}>
                <Icon name="bank-transfer" size={18} color={brandColors.tealPrimary} />
                <Text style={[styles.quickActionText, { color: brandColors.tealPrimary }]}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickActionButton, styles.quickActionButtonSecondary]}>
                <Icon name="lightbulb-on" size={18} color={brandColors.tealPrimary} />
                <Text style={[styles.quickActionText, { color: brandColors.tealPrimary }]}>What If</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FINANCIAL HEALTH BAR */}
        <View style={styles.section}>
          <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Icon name="heart-pulse" size={20} color={brandColors.orangeAccent} />
              <Text style={styles.healthTitle}>Financial Health</Text>
              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>Good</Text>
              </View>
            </View>
            <Text style={styles.healthDescription}>
              You're on track. Your cushion covers ~12 days of expenses.
            </Text>
          </View>
        </View>

        {/* OTHER ACCOUNTS - Compact List */}
        {accounts.filter(a => a.id !== selectedAccountId).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Other Accounts</Text>
            {accounts.filter(a => a.id !== selectedAccountId).map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountRow}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <View style={styles.accountRowLeft}>
                  <View style={[styles.accountRowIcon, { backgroundColor: brandColors.tealLight + '20' }]}>
                    <Icon name={accountIcons[account.type as keyof typeof accountIcons]} size={20} color={brandColors.tealPrimary} />
                  </View>
                  <View>
                    <Text style={styles.accountRowName}>{account.name}</Text>
                    <Text style={styles.accountRowLabel}>Available to Spend</Text>
                  </View>
                </View>
                <Text style={styles.accountRowAmount}>{formatCurrency(account.availableToSpend)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* UPCOMING TRANSACTIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next 3 Days</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>View Calendar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineCard}>
            {upcomingTransactions.map((txn, index) => (
              <View key={index}>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    <View style={[
                      styles.timelineIcon,
                      { backgroundColor: txn.type === 'income' ? brandColors.success + '20' : brandColors.error + '15' }
                    ]}>
                      <Icon
                        name={txn.icon}
                        size={16}
                        color={txn.type === 'income' ? brandColors.success : brandColors.error}
                      />
                    </View>
                    {index < upcomingTransactions.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineTop}>
                      <Text style={styles.timelineName}>{txn.name}</Text>
                      <Text style={[
                        styles.timelineAmount,
                        { color: txn.type === 'income' ? brandColors.success : brandColors.error }
                      ]}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </Text>
                    </View>
                    <Text style={styles.timelineDate}>{txn.date}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* GOALS PROGRESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Goals</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {goals.map((goal, index) => (
            <View key={index} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalProgress}>
                  {formatCurrency(goal.saved)} / {formatCurrency(goal.target)}
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalBarFill, { width: `${(goal.saved / goal.target) * 100}%`, backgroundColor: goal.color }]} />
              </View>
              <Text style={styles.goalPercent}>{Math.round((goal.saved / goal.target) * 100)}% complete</Text>
            </View>
          ))}
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.orangeAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.white + 'CC',
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.white,
  },
  settingsButton: {
    padding: 8,
  },
  totalBanner: {
    backgroundColor: brandColors.tealPrimary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: brandColors.white,
    opacity: 0.8,
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: brandColors.white,
    letterSpacing: -1,
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Spotlight Card
  spotlightCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  accountSelector: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: brandColors.tealPrimary + '10',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  selectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },
  spotlightAmount: {
    marginBottom: 20,
    alignItems: 'center',
  },
  spotlightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 8,
  },
  spotlightValue: {
    fontSize: 52,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -2,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: brandColors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: brandColors.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 10,
  },
  quickActionButtonSecondary: {
    backgroundColor: brandColors.white,
    borderWidth: 1.5,
    borderColor: brandColors.tealPrimary,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.white,
  },

  // Health Card
  healthCard: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: brandColors.orangeAccent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  healthTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  healthBadge: {
    backgroundColor: brandColors.success + '20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.success,
  },
  healthDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 18,
  },

  // Account Row
  accountRow: {
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
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  accountRowLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  accountRowAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineIconContainer: {
    alignItems: 'center',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: brandColors.border,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  timelineAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },

  // Goal Card
  goalCard: {
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
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  goalProgress: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.textGray,
  },
  goalBar: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },
});
