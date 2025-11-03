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
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';
import {
  ExportPeriod,
  EXPORT_PERIODS,
  exportTransactionsCSV,
  exportBudgetCSV,
  exportAnalyticsCSV,
  exportAllDataCSV,
} from '../utils/csvExport';

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
  // Distinct, vibrant colors for line chart visibility
  'Housing': '#FF6B35',        // Bright Orange
  'Transportation': '#004E89',  // Deep Blue
  'Food': '#F72585',           // Hot Pink
  'Groceries': '#7209B7',      // Purple
  'Shopping': '#3A0CA3',       // Deep Purple
  'Health': '#4CC9F0',         // Cyan
  'Insurance': '#F77F00',      // Dark Orange
  'Subscriptions': '#06FFA5',  // Mint Green
  'Utilities': '#FFD60A',      // Yellow
  'Personal Care': '#FB5607',  // Red-Orange
  'Travel': '#8338EC',         // Violet
  'Gifts & Donations': '#06D6A0', // Teal
  'Entertainment': '#EC4899',  // Magenta
  'Uncategorized': '#9CA3AF',  // Gray
  // Legacy mappings
  'Food & Dining': '#F72585',
  'Bills & Utilities': '#FFD60A',
  'Healthcare': '#4CC9F0',
  'Education': '#3A0CA3',
  'Personal': '#FB5607',
  'Other': '#9CA3AF',
};

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<ExportPeriod>('this_month');
  const [exporting, setExporting] = useState(false);
  const [exportSectionExpanded, setExportSectionExpanded] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

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

  // Auto-select top non-housing categories for the trend chart
  useEffect(() => {
    if (transactions.length === 0) return;

    // Calculate category totals
    const categoryTotals: { [key: string]: number } = {};
    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;
      const category = txn.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(txn.amount);
    });

    // Get top 3 non-housing categories
    const topCategories = Object.entries(categoryTotals)
      .filter(([category]) => category !== 'Housing')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    setSelectedCategories(new Set(topCategories));
  }, [transactions]);

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

  // Calculate spending by category over time
  const getCategoryTrends = () => {
    const categoryByMonth: { [monthKey: string]: { [category: string]: number } } = {};

    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      const category = txn.category || 'Uncategorized';

      if (!categoryByMonth[monthKey]) {
        categoryByMonth[monthKey] = {};
      }

      categoryByMonth[monthKey][category] = (categoryByMonth[monthKey][category] || 0) + Math.abs(txn.amount);
    });

    return Object.entries(categoryByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Last 6 months
  };

  // Calculate month-over-month comparison by category
  const getMonthOverMonthComparison = () => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthByCategory: { [category: string]: number } = {};
    const lastMonthByCategory: { [category: string]: number } = {};

    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;
      const category = txn.category || 'Uncategorized';
      const amount = Math.abs(txn.amount);

      if (monthKey === currentMonthKey) {
        currentMonthByCategory[category] = (currentMonthByCategory[category] || 0) + amount;
      } else if (monthKey === lastMonthKey) {
        lastMonthByCategory[category] = (lastMonthByCategory[category] || 0) + amount;
      }
    });

    // Get all unique categories
    const allCategories = new Set([
      ...Object.keys(currentMonthByCategory),
      ...Object.keys(lastMonthByCategory)
    ]);

    const comparisons = Array.from(allCategories).map((category) => {
      const currentAmount = currentMonthByCategory[category] || 0;
      const lastAmount = lastMonthByCategory[category] || 0;
      const change = currentAmount - lastAmount;
      const percentChange = lastAmount > 0 ? ((change / lastAmount) * 100) : (currentAmount > 0 ? 100 : 0);

      return {
        category,
        currentAmount,
        lastAmount,
        change,
        percentChange,
        color: CATEGORY_COLORS[category] || '#9CA3AF',
      };
    });

    // Sort by absolute change (biggest changes first)
    return comparisons
      .filter(c => c.currentAmount > 0 || c.lastAmount > 0) // Only show categories with data
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5); // Top 5 biggest changes
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  // Handle export
  const handleExport = async (type: 'transactions' | 'budget' | 'analytics' | 'all') => {
    if (!user) return;

    setExporting(true);
    try {
      switch (type) {
        case 'transactions':
          await exportTransactionsCSV(user.uid, exportPeriod);
          break;
        case 'budget':
          await exportBudgetCSV(user.uid, exportPeriod);
          break;
        case 'analytics':
          await exportAnalyticsCSV(user.uid, exportPeriod);
          break;
        case 'all':
          await exportAllDataCSV(user.uid, exportPeriod);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const { totalIncome, totalExpenses, netSavings } = getKeyMetrics();
  const categoryData = getSpendingByCategory();
  const categoryTrends = getCategoryTrends();
  const monthOverMonthData = getMonthOverMonthComparison();
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

        {/* KEY METRICS CARDS - Compact row layout */}
        <View style={styles.section}>
          <View style={styles.metricsRowCompact}>
            <View style={[styles.metricCardCompact, { borderLeftColor: brandColors.success }]}>
              <Text style={styles.metricLabelCompact}>Total Income</Text>
              <Text style={[styles.metricValueCompact, { color: brandColors.success }]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={[styles.metricCardCompact, { borderLeftColor: brandColors.error }]}>
              <Text style={styles.metricLabelCompact}>Total Expenses</Text>
              <Text style={[styles.metricValueCompact, { color: brandColors.error }]}>
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
            <View style={[styles.metricCardCompact, { borderLeftColor: brandColors.tealPrimary }]}>
              <Text style={styles.metricLabelCompact}>Net Savings</Text>
              <Text style={[styles.metricValueCompact, { color: netSavings >= 0 ? brandColors.tealPrimary : brandColors.error }]}>
                {formatCurrency(netSavings)}
              </Text>
            </View>
          </View>
        </View>

        {/* EXPORT DATA SECTION */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.exportToggleButton}
            onPress={() => setExportSectionExpanded(!exportSectionExpanded)}
            activeOpacity={0.7}
          >
            <Icon name="download" size={24} color={brandColors.tealPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exportToggleTitle}>Export Data</Text>
              <Text style={styles.exportToggleSubtitle}>Download your financial data as CSV</Text>
            </View>
            <Icon
              name={exportSectionExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color={brandColors.tealPrimary}
            />
          </TouchableOpacity>

          {exportSectionExpanded && (
            <View style={styles.exportExpandedContent}>
              <View style={styles.exportPeriodPickerContainer}>
                <TouchableOpacity
                  style={styles.exportPeriodPicker}
                  onPress={() => setShowExportPicker(true)}
                >
                  <Icon name="calendar-month" size={16} color={brandColors.tealPrimary} />
                  <Text style={styles.exportPeriodPickerText}>
                    {EXPORT_PERIODS.find(p => p.value === exportPeriod)?.label}
                  </Text>
                  <Icon name="chevron-down" size={16} color={brandColors.textGray} />
                </TouchableOpacity>
              </View>

              <View style={styles.exportButtonsContainer}>
                <TouchableOpacity
                  style={styles.exportDataButton}
                  onPress={() => handleExport('transactions')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={brandColors.tealPrimary} />
                  ) : (
                    <Icon name="receipt" size={20} color={brandColors.tealPrimary} />
                  )}
                  <Text style={styles.exportDataButtonText}>Transactions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportDataButton}
                  onPress={() => handleExport('budget')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={brandColors.tealPrimary} />
                  ) : (
                    <Icon name="wallet" size={20} color={brandColors.tealPrimary} />
                  )}
                  <Text style={styles.exportDataButtonText}>Budget</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.exportDataButton}
                  onPress={() => handleExport('analytics')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={brandColors.tealPrimary} />
                  ) : (
                    <Icon name="chart-bar" size={20} color={brandColors.tealPrimary} />
                  )}
                  <Text style={styles.exportDataButtonText}>Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportDataButton, styles.exportAllDataButton]}
                  onPress={() => handleExport('all')}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator size="small" color={brandColors.white} />
                  ) : (
                    <Icon name="database-export" size={20} color={brandColors.white} />
                  )}
                  <Text style={[styles.exportDataButtonText, styles.exportAllDataButtonText]}>Export All</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* MONTH-OVER-MONTH COMPARISON */}
        {monthOverMonthData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>Month-over-Month Changes</Text>
                  <Text style={styles.chartSubtitle}>Top category changes from last month</Text>
                </View>
              </View>

              <View style={styles.comparisonContainer}>
                {monthOverMonthData.map((item) => {
                  const isIncrease = item.change > 0;
                  const changeColor = isIncrease ? brandColors.error : brandColors.success;

                  return (
                    <View key={item.category} style={styles.comparisonRow}>
                      <View style={[styles.barColorDot, { backgroundColor: item.color }]} />
                      <Text style={styles.comparisonCategory} numberOfLines={1}>
                        {item.category}
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.comparisonAmount}>
                        {formatCurrency(item.currentAmount)}
                      </Text>
                      <Icon
                        name={isIncrease ? 'arrow-up' : 'arrow-down'}
                        size={16}
                        color={changeColor}
                        style={{ marginLeft: 8 }}
                      />
                      <Text style={[styles.comparisonPercent, { color: changeColor }]}>
                        {Math.abs(item.percentChange).toFixed(0)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

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
              <View style={styles.pieChartRow}>
                {/* Pie Chart */}
                <View style={styles.pieChartLeft}>
                  <PieChart
                    data={categoryData.map((cat) => {
                      const percentage = totalSpending > 0 ? (cat.amount / totalSpending) * 100 : 0;
                      return {
                        name: `${Math.round(percentage)}%`,
                        population: cat.amount,
                        color: cat.color,
                        legendFontColor: brandColors.textDark,
                        legendFontSize: 12,
                      };
                    })}
                    width={200}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="20"
                    center={[10, 0]}
                    absolute={false}
                    hasLegend={false}
                  />
                </View>

                {/* Custom Interactive Legend */}
                <View style={styles.pieLegendRight}>
                  {categoryData.map((cat) => {
                    const percentage = totalSpending > 0 ? (cat.amount / totalSpending) * 100 : 0;
                    const isSelected = selectedSlice === cat.name;

                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.pieLegendItem, isSelected && styles.pieLegendItemSelected]}
                        onPress={() => setSelectedSlice(isSelected ? null : cat.name)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.pieLegendDot, { backgroundColor: cat.color }]} />
                        <View style={styles.pieLegendTextContainer}>
                          <Text style={styles.pieLegendLabel} numberOfLines={1}>{cat.name}</Text>
                          {isSelected && (
                            <View style={styles.pieLegendDetails}>
                              <Text style={styles.pieLegendAmount}>{formatCurrency(cat.amount)}</Text>
                              <Text style={styles.pieLegendPercent}>{percentage.toFixed(1)}%</Text>
                            </View>
                          )}
                        </View>
                        {!isSelected && (
                          <Text style={styles.pieLegendPercentCompact}>{Math.round(percentage)}%</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* CATEGORY TRENDS OVER TIME */}
        <View style={styles.section}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Spending Trends by Category</Text>
                <Text style={styles.chartSubtitle}>Click categories to add/remove from chart</Text>
              </View>
            </View>

            {/* Category selector pills */}
            <View style={styles.categoryPillsContainer}>
              {categoryData.slice(0, 8).map((cat) => {
                const isSelected = selectedCategories.has(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillActive,
                      { borderColor: cat.color }
                    ]}
                    onPress={() => toggleCategory(cat.name)}
                  >
                    <View style={[styles.categoryPillDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Line chart with react-native-chart-kit */}
            {selectedCategories.size === 0 ? (
              <Text style={styles.noDataText}>Select categories above to view trends</Text>
            ) : categoryTrends.length === 0 ? (
              <Text style={styles.noDataText}>No data available</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: categoryTrends.map(([monthKey]) =>
                      new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short' })
                    ),
                    datasets: Array.from(selectedCategories).map((category) => {
                      const color = categoryData.find(c => c.name === category)?.color || '#9CA3AF';
                      return {
                        data: categoryTrends.map(([, cats]) => cats[category] || 0),
                        color: () => color,
                        strokeWidth: 3,
                      };
                    }),
                  }}
                  width={Math.max(Dimensions.get('window').width - 60, categoryTrends.length * 80)}
                  height={220}
                  yAxisLabel="$"
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: brandColors.white,
                    backgroundGradientFrom: brandColors.white,
                    backgroundGradientTo: brandColors.white,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(58, 107, 130, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: brandColors.white,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: brandColors.border,
                      strokeWidth: 1,
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              </ScrollView>
            )}
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

      {/* EXPORT PERIOD PICKER MODAL */}
      <Modal
        visible={showExportPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExportPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Period</Text>
              <TouchableOpacity onPress={() => setShowExportPicker(false)}>
                <Icon name="close" size={24} color={brandColors.textDark} />
              </TouchableOpacity>
            </View>

            {EXPORT_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={styles.dateRangeOption}
                onPress={() => {
                  setExportPeriod(period.value);
                  setShowExportPicker(false);
                }}
              >
                <Text style={styles.dateRangeOptionText}>{period.label}</Text>
                {period.value === exportPeriod && (
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

  // Key Metrics - Compact
  metricsRowCompact: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCardCompact: {
    flex: 1,
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    justifyContent: 'space-between',
    minHeight: 85,
  },
  metricLabelCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 8,
    lineHeight: 16,
  },
  metricValueCompact: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 20,
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

  // Pie Chart
  pieChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  pieChartLeft: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pieLegendRight: {
    flex: 1,
    gap: 6,
    justifyContent: 'flex-start',
    marginLeft: -30,
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieLegendContainer: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 8,
    gap: 8,
  },
  pieLegendItemSelected: {
    backgroundColor: brandColors.tealPrimary + '10',
    borderWidth: 1,
    borderColor: brandColors.tealPrimary + '40',
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendTextContainer: {
    flex: 1,
  },
  pieLegendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  pieLegendDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  pieLegendAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },
  pieLegendPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  pieLegendPercentCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textDark,
    minWidth: 35,
    textAlign: 'right',
  },

  // Month-over-Month Comparison
  comparisonContainer: {
    gap: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 10,
    gap: 10,
  },
  comparisonCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    minWidth: 80,
    maxWidth: 120,
  },
  comparisonAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  comparisonPercent: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
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

  // Category Pills
  categoryPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  categoryPillActive: {
    backgroundColor: brandColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textGray,
    maxWidth: 100,
  },
  categoryPillTextActive: {
    color: brandColors.textDark,
    fontWeight: '700',
  },

  // Simple Area Chart
  simpleChartContainer: {
    height: 220,
    position: 'relative',
  },
  simpleChartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingHorizontal: 8,
    gap: 4,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  monthBars: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 2,
  },
  categoryBar: {
    width: '100%',
    borderRadius: 4,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    textAlign: 'center',
  },
  chartYAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 180,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  chartYAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: brandColors.textGray,
    backgroundColor: brandColors.white + 'EE',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Export modal styles
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 16,
    shadowColor: brandColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: brandColors.tealPrimary + '20',
  },
  exportToggleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  exportToggleSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  exportExpandedContent: {
    backgroundColor: brandColors.white,
    marginTop: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: brandColors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  exportPeriodPickerContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  exportPeriodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: brandColors.backgroundOffWhite,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.tealPrimary + '40',
  },
  exportPeriodPickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  exportDataButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 1,
    borderColor: brandColors.tealPrimary + '40',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  exportDataButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },
  exportAllDataButton: {
    flex: 1,
    minWidth: '100%',
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  exportAllDataButtonText: {
    color: brandColors.white,
  },
  exportingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 8,
  },
  exportingText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
  },
});
