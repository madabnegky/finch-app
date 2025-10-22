// REPORTS SCREEN - Executive+ Design System
// Redesigned to match DashboardConcept4 styling
// - Clean professional layout with Executive+ design principles
// - Custom header with Finch logo and date range selector
// - Key metrics cards for financial overview
// - Simplified bar chart visualizations
// - Data-focused, condensed spacing
// - Teal primary (#3A6B82), Orange accent (#F5A52D)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
};

type DateRange = '30days' | '90days' | '6months' | 'year';

const DATE_RANGES = [
  { value: '30days' as DateRange, label: 'Last 30 Days' },
  { value: '90days' as DateRange, label: 'Last 90 Days' },
  { value: '6months' as DateRange, label: 'Last 6 Months' },
  { value: 'year' as DateRange, label: 'Last Year' },
];

const CATEGORY_COLORS: { [key: string]: string } = {
  'Food & Dining': '#EF4444',
  'Shopping': '#8B5CF6',
  'Transportation': '#3A6B82',
  'Bills & Utilities': '#F5A52D',
  'Entertainment': '#EC4899',
  'Healthcare': '#10B981',
  'Travel': '#06B6D4',
  'Personal': '#F97316',
  'Education': '#14B8A6',
  'Other': '#6B7280',
  'Uncategorized': '#9CA3AF',
};

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Calculate date based on selected range
    const getStartDate = () => {
      const date = new Date();
      switch (dateRange) {
        case '30days':
          date.setDate(date.getDate() - 30);
          break;
        case '90days':
          date.setDate(date.getDate() - 90);
          break;
        case '6months':
          date.setMonth(date.getMonth() - 6);
          break;
        case 'year':
          date.setFullYear(date.getFullYear() - 1);
          break;
      }
      return date;
    };

    const startDate = getStartDate();

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('date', '>=', firestore.Timestamp.fromDate(startDate))
      .orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        const txns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        setTransactions(txns);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Calculate key metrics
  const getKeyMetrics = () => {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((txn) => {
      if (txn.type === 'income') {
        totalIncome += Math.abs(txn.amount);
      } else if (txn.type === 'expense') {
        totalExpenses += Math.abs(txn.amount);
      }
    });

    const netSavings = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netSavings };
  };

  // Calculate spending by category
  const getSpendingByCategory = () => {
    const categoryTotals: { [key: string]: number } = {};

    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const category = txn.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(txn.amount);
    });

    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        color: CATEGORY_COLORS[name] || '#9CA3AF',
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Calculate income vs expenses trend (simplified monthly)
  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach((txn) => {
      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      if (txn.type === 'income') {
        monthlyData[monthKey].income += Math.abs(txn.amount);
      } else if (txn.type === 'expense') {
        monthlyData[monthKey].expenses += Math.abs(txn.amount);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  };

  const { totalIncome, totalExpenses, netSavings } = getKeyMetrics();
  const categoryData = getSpendingByCategory();
  const monthlyTrend = getMonthlyTrend();
  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  // Get max value for chart scaling
  const getMaxValue = () => {
    if (categoryData.length === 0) return 100;
    return Math.max(...categoryData.map(c => c.amount));
  };

  const maxValue = getMaxValue();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => (navigation as any).openDrawer()}
              >
                <Icon name="menu" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FinchLogo size={32} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Reports</Text>
                <Text style={styles.headerSubtitle}>Insights & Analytics</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dateRangeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-range" size={18} color={brandColors.tealPrimary} />
              <Text style={styles.dateRangeText}>
                {DATE_RANGES.find(d => d.value === dateRange)?.label}
              </Text>
              <Icon name="chevron-down" size={16} color={brandColors.textGray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* KEY METRICS CARDS */}
        <View style={styles.section}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: brandColors.success }]}>
              <Icon name="trending-up" size={20} color={brandColors.success} />
              <Text style={styles.metricLabel}>TOTAL INCOME</Text>
              <Text style={[styles.metricValue, { color: brandColors.success }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: brandColors.error }]}>
              <Icon name="trending-down" size={20} color={brandColors.error} />
              <Text style={styles.metricLabel}>TOTAL EXPENSES</Text>
              <Text style={[styles.metricValue, { color: brandColors.error }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
            <View style={[styles.metricCard, { borderLeftColor: brandColors.tealPrimary }]}>
              <Icon name="wallet" size={20} color={brandColors.tealPrimary} />
              <Text style={styles.metricLabel}>NET SAVINGS</Text>
              <Text style={[styles.metricValue, { color: netSavings >= 0 ? brandColors.tealPrimary : brandColors.error }]}>
                {formatCurrency(netSavings)}
              </Text>
            </View>
          </View>
        </View>

        {/* SPENDING BY CATEGORY CHART */}
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Spending by Category</Text>
                <Text style={styles.chartSubtitle}>Total: {formatCurrency(totalSpending)}</Text>
              </View>
            </View>

            {categoryData.length === 0 ? (
              <Text style={styles.noDataText}>No spending data for this period</Text>
            ) : (
              <View style={styles.barChartContainer}>
                {categoryData.map((cat) => {
                  const percentage = (cat.amount / maxValue) * 100;
                  const displayPercentage = totalSpending > 0 ? ((cat.amount / totalSpending) * 100) : 0;

                  return (
                    <View key={cat.name} style={styles.barRow}>
                      <View style={styles.barLabelContainer}>
                        <View style={[styles.barColorDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </View>
                      <View style={styles.barChartRight}>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              {
                                width: `${Math.max(percentage, 5)}%`,
                                backgroundColor: cat.color,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.barValues}>
                          <Text style={styles.barAmount}>{formatCurrency(cat.amount)}</Text>
                          <Text style={styles.barPercentage}>{displayPercentage.toFixed(0)}%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* INCOME VS EXPENSES TREND */}
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Income vs Expenses</Text>
                <Text style={styles.chartSubtitle}>Monthly comparison</Text>
              </View>
            </View>

            {monthlyTrend.length === 0 ? (
              <Text style={styles.noDataText}>No data available</Text>
            ) : (
              <View style={styles.trendContainer}>
                {/* Legend */}
                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: brandColors.success }]} />
                    <Text style={styles.legendText}>Income</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: brandColors.error }]} />
                    <Text style={styles.legendText}>Expenses</Text>
                  </View>
                </View>

                {/* Simplified bar chart */}
                <View style={styles.trendChartContainer}>
                  <View style={styles.trendChartBars}>
                    {monthlyTrend.map(([monthKey, data], index) => {
                      const maxMonthlyValue = Math.max(
                        ...monthlyTrend.map(([, d]) => Math.max(d.income, d.expenses))
                      );
                      const incomeHeight = (data.income / maxMonthlyValue) * 100;
                      const expenseHeight = (data.expenses / maxMonthlyValue) * 100;

                      return (
                        <View key={monthKey} style={styles.trendBarGroup}>
                          <View style={styles.trendBars}>
                            <View
                              style={[
                                styles.trendBar,
                                {
                                  height: `${Math.max(incomeHeight, 5)}%`,
                                  backgroundColor: brandColors.success,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.trendBar,
                                {
                                  height: `${Math.max(expenseHeight, 5)}%`,
                                  backgroundColor: brandColors.error,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.trendLabel}>
                            {new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* TOP SPENDING CATEGORIES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Spending Categories</Text>
          </View>
          <View style={styles.topCategoriesContainer}>
            {categoryData.slice(0, 5).map((cat, index) => {
              const percentage = totalSpending > 0 ? ((cat.amount / totalSpending) * 100) : 0;

              return (
                <View key={cat.name} style={styles.topCategoryCard}>
                  <View style={styles.topCategoryLeft}>
                    <View style={[styles.topCategoryIcon, { backgroundColor: cat.color + '15' }]}>
                      <View style={[styles.topCategoryDot, { backgroundColor: cat.color }]} />
                    </View>
                    <View style={styles.topCategoryInfo}>
                      <Text style={styles.topCategoryName}>{cat.name}</Text>
                      <Text style={styles.topCategoryPercentage}>{percentage.toFixed(1)}% of total</Text>
                    </View>
                  </View>
                  <View style={styles.topCategoryRight}>
                    <Text style={styles.topCategoryAmount}>{formatCurrency(cat.amount)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* DATE RANGE PICKER MODAL */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
            </View>
            {DATE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.dateRangeOption,
                  range.value === dateRange && styles.dateRangeOptionActive
                ]}
                onPress={() => {
                  setDateRange(range.value);
                  setShowDatePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.dateRangeOptionText,
                    range.value === dateRange && styles.dateRangeOptionTextActive
                  ]}
                >
                  {range.label}
                </Text>
                {range.value === dateRange && (
                  <Icon name="check-circle" size={24} color={brandColors.orangeAccent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },

  // Header
  header: {
    backgroundColor: brandColors.white,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brandColors.orangeAccent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 2,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: brandColors.tealPrimary + '10',
    borderRadius: 20,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
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

  // Key Metrics
  metricsRow: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textGray,
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },

  // Chart Card
  chartCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  noDataText: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Bar Chart
  barChartContainer: {
    gap: 12,
  },
  barRow: {
    gap: 10,
  },
  barLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  barColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textDark,
    flex: 1,
  },
  barChartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barContainer: {
    flex: 1,
    height: 32,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  barValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 120,
  },
  barAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  barPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },

  // Trend Chart
  trendContainer: {
    gap: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  trendChartContainer: {
    height: 180,
  },
  trendChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingHorizontal: 8,
  },
  trendBarGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: '100%',
    width: '100%',
  },
  trendBar: {
    flex: 1,
    borderRadius: 6,
    minHeight: 8,
  },
  trendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    textAlign: 'center',
  },

  // Top Categories
  topCategoriesContainer: {
    gap: 10,
  },
  topCategoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  topCategoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCategoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  topCategoryInfo: {
    flex: 1,
  },
  topCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  topCategoryPercentage: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  topCategoryRight: {
    alignItems: 'flex-end',
  },
  topCategoryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brandColors.textDark,
  },
  dateRangeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  dateRangeOptionActive: {
    backgroundColor: brandColors.tealPrimary + '10',
    borderWidth: 2,
    borderColor: brandColors.orangeAccent,
  },
  dateRangeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  dateRangeOptionTextActive: {
    color: brandColors.tealPrimary,
    fontWeight: '700',
  },
});
