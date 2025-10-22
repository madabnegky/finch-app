// CONCEPT 2: "Executive Dashboard" Design
// - Sophisticated, data-focused layout
// - Account carousel with horizontal scroll
// - Emphasis on financial insights and projections
// - Professional color blocking with orange accents

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import { accountIcons, navigationIcons, specialIcons } from '../theme/icons';

export const DashboardConcept2 = () => {
  const [selectedAccountId, setSelectedAccountId] = useState('1');

  // Mock data
  const accounts = [
    { id: '1', name: 'Chase Checking', type: 'checking', availableToSpend: 1847.32, balance: 2500, cushion: 500, projectedLow: 1650 },
    { id: '2', name: 'Savings Account', type: 'savings', availableToSpend: 5200.00, balance: 6000, cushion: 800, projectedLow: 5000 },
    { id: '3', name: 'Credit Card', type: 'credit', availableToSpend: 850.00, balance: -150, cushion: 0, projectedLow: -300 },
  ];

  const insights = [
    { icon: 'trending-up', label: 'On track this month', color: brandColors.success },
    { icon: 'alert-circle', label: '2 bills due soon', color: brandColors.orangeAccent },
  ];

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Icon name={specialIcons.finch} size={28} color={brandColors.orangeAccent} />
              <Text style={styles.headerTitle}>Dashboard</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="magnify" size={22} color={brandColors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="bell-outline" size={22} color={brandColors.textDark} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ACCOUNT CAROUSEL */}
        <View style={styles.carouselSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            pagingEnabled
          >
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountCarouselCard,
                  account.id === selectedAccountId && styles.accountCarouselCardActive
                ]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <View style={styles.accountCardHeader}>
                  <View style={[styles.accountCardIcon, { backgroundColor: brandColors.orangeAccent + '20' }]}>
                    <Icon name={accountIcons[account.type as keyof typeof accountIcons]} size={24} color={brandColors.orangeAccent} />
                  </View>
                  <Text style={styles.accountCardName}>{account.name}</Text>
                </View>
                <Text style={styles.accountCardLabel}>Available to Spend</Text>
                <Text style={styles.accountCardAmount}>{formatCurrency(account.availableToSpend)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* PRIMARY FOCUS: Available to Spend Breakdown */}
        <View style={styles.section}>
          <View style={styles.focusCard}>
            <View style={styles.focusHeader}>
              <View>
                <Text style={styles.focusTitle}>Available to Spend</Text>
                <Text style={styles.focusSubtitle}>{selectedAccount.name}</Text>
              </View>
              <TouchableOpacity style={styles.changeAccountButton}>
                <Text style={styles.changeAccountText}>Change</Text>
                <Icon name="chevron-down" size={16} color={brandColors.tealPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.focusAmountContainer}>
              <Text style={styles.focusAmount}>{formatCurrency(selectedAccount.availableToSpend)}</Text>
              <View style={styles.focusTrend}>
                <Icon name="trending-up" size={16} color={brandColors.success} />
                <Text style={styles.focusTrendText}>+12% from last month</Text>
              </View>
            </View>

            {/* Financial Breakdown */}
            <View style={styles.breakdown}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownDot} style={{ backgroundColor: brandColors.tealPrimary }} />
                  <Text style={styles.breakdownLabel}>Total Balance</Text>
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(selectedAccount.balance)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownDot} style={{ backgroundColor: brandColors.orangeAccent }} />
                  <Text style={styles.breakdownLabel}>Safety Cushion</Text>
                </View>
                <Text style={styles.breakdownValue}>-{formatCurrency(selectedAccount.cushion)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownDot} style={{ backgroundColor: '#8B5CF6' }} />
                  <Text style={styles.breakdownLabel}>Goal Allocations</Text>
                </View>
                <Text style={styles.breakdownValue}>-{formatCurrency(152.68)}</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotal}>Available</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(selectedAccount.availableToSpend)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* INSIGHTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Insights</Text>
          <View style={styles.insightsGrid}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <Icon name={insight.icon} size={24} color={insight.color} />
                <Text style={styles.insightText}>{insight.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 60-DAY PROJECTION */}
        <View style={styles.section}>
          <View style={styles.projectionCard}>
            <View style={styles.projectionHeader}>
              <View>
                <Text style={styles.projectionTitle}>60-Day Projection</Text>
                <Text style={styles.projectionSubtitle}>Based on recurring transactions</Text>
              </View>
              <TouchableOpacity>
                <Icon name="information-outline" size={20} color={brandColors.textGray} />
              </TouchableOpacity>
            </View>

            {/* Simplified chart representation */}
            <View style={styles.chartPlaceholder}>
              <View style={styles.chartBar} style={{ height: '60%', backgroundColor: brandColors.tealLight }} />
              <View style={styles.chartBar} style={{ height: '45%', backgroundColor: brandColors.tealPrimary }} />
              <View style={styles.chartBar} style={{ height: '70%', backgroundColor: brandColors.tealLight }} />
              <View style={styles.chartBar} style={{ height: '55%', backgroundColor: brandColors.tealPrimary }} />
              <View style={styles.chartBar} style={{ height: '50%', backgroundColor: brandColors.error }} />
              <View style={styles.chartBar} style={{ height: '65%', backgroundColor: brandColors.tealLight }} />
            </View>

            <View style={styles.projectionStats}>
              <View style={styles.projectionStat}>
                <Text style={styles.projectionStatLabel}>Projected Low</Text>
                <Text style={[styles.projectionStatValue, { color: brandColors.error }]}>
                  {formatCurrency(selectedAccount.projectedLow)}
                </Text>
              </View>
              <View style={styles.projectionDivider} />
              <View style={styles.projectionStat}>
                <Text style={styles.projectionStatLabel}>Ending Balance</Text>
                <Text style={[styles.projectionStatValue, { color: brandColors.success }]}>
                  {formatCurrency(selectedAccount.balance + 200)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS BAR */}
        <View style={styles.section}>
          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.actionBarButton}>
              <Icon name="plus-circle" size={20} color={brandColors.white} />
              <Text style={styles.actionBarText}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBarButton, styles.actionBarButtonSecondary]}>
              <Icon name="lightbulb-on" size={20} color={brandColors.tealPrimary} />
              <Text style={[styles.actionBarText, { color: brandColors.tealPrimary }]}>What If</Text>
            </TouchableOpacity>
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
    backgroundColor: brandColors.white,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.orangeAccent,
  },

  // Account Carousel
  carouselSection: {
    paddingVertical: 20,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  accountCarouselCard: {
    width: 180,
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: brandColors.border,
    marginRight: 4,
  },
  accountCarouselCardActive: {
    borderColor: brandColors.tealPrimary,
    shadowColor: brandColors.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  accountCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountCardName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  accountCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountCardAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: brandColors.tealPrimary,
    letterSpacing: -0.5,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: brandColors.textDark,
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Focus Card
  focusCard: {
    backgroundColor: brandColors.white,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  focusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  focusSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  changeAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: brandColors.tealPrimary + '10',
    borderRadius: 8,
  },
  changeAccountText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },
  focusAmountContainer: {
    marginBottom: 24,
  },
  focusAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -2,
    marginBottom: 8,
  },
  focusTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  focusTrendText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.success,
  },

  // Breakdown
  breakdown: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: brandColors.border,
    marginVertical: 8,
  },
  breakdownTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  breakdownTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.tealPrimary,
  },

  // Insights
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textDark,
    textAlign: 'center',
  },

  // Projection Card
  projectionCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  projectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  projectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  chartPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  chartBar: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  projectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectionStat: {
    flex: 1,
    alignItems: 'center',
  },
  projectionStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 6,
  },
  projectionStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  projectionDivider: {
    width: 1,
    height: 40,
    backgroundColor: brandColors.border,
  },

  // Actions Bar
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brandColors.tealPrimary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionBarButtonSecondary: {
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.tealPrimary,
  },
  actionBarText: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.white,
  },
});
