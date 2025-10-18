import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
};

const CATEGORY_COLORS = [
  '#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
];

type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
};

export const ReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (!user) return;

    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('date', '>=', firestore.Timestamp.fromDate(sixMonthsAgo))
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
  }, [user]);

  // Calculate spending by category for current month
  const getSpendingByCategory = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categoryTotals: { [key: string]: number } = {};

    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
        const category = txn.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + txn.amount;
      }
    });

    return Object.entries(categoryTotals)
      .map(([name, amount], index) => ({
        name,
        amount,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        legendFontColor: brandColors.textDark,
        legendFontSize: 12,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Calculate monthly spending trend for last 6 months
  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: number } = {};
    const labels: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('en-US', { month: 'short' });
      labels.push(label);
      monthlyData[key] = 0;
    }

    transactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      const key = `${txnDate.getFullYear()}-${txnDate.getMonth()}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += txn.amount;
      }
    });

    return {
      labels,
      datasets: [
        {
          data: Object.values(monthlyData),
          color: () => brandColors.primaryBlue,
          strokeWidth: 2,
        },
      ],
    };
  };

  const categoryData = getSpendingByCategory();
  const trendData = getMonthlyTrend();

  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.amount, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primaryBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Month Spending by Category */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Current Month Spending by Category</Text>
          {categoryData.length === 0 ? (
            <Text style={styles.noDataText}>No spending data for current month</Text>
          ) : (
            <>
              <PieChart
                data={categoryData}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  color: () => brandColors.primaryBlue,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Spending:</Text>
                <Text style={styles.totalAmount}>${totalSpending.toFixed(2)}</Text>
              </View>

              {/* Category Breakdown */}
              <View style={styles.categoryList}>
                {categoryData.map((cat, index) => (
                  <View key={cat.name} style={styles.categoryItem}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                      <Text style={styles.categoryName}>{cat.name}</Text>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryAmount}>${cat.amount.toFixed(2)}</Text>
                      <Text style={styles.categoryPercent}>
                        {((cat.amount / totalSpending) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* 6-Month Spending Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>6-Month Spending Trend</Text>
          {trendData.datasets[0].data.every((val) => val === 0) ? (
            <Text style={styles.noDataText}>No spending data for last 6 months</Text>
          ) : (
            <LineChart
              data={trendData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: brandColors.white,
                backgroundGradientFrom: brandColors.white,
                backgroundGradientTo: brandColors.white,
                decimalPlaces: 0,
                color: () => brandColors.primaryBlue,
                labelColor: () => brandColors.textGray,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: brandColors.primaryBlue,
                },
              }}
              bezier
              style={styles.lineChart}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  chartCard: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    paddingVertical: 40,
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.red,
  },
  categoryList: {
    marginTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: brandColors.textDark,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  categoryPercent: {
    fontSize: 12,
    color: brandColors.textGray,
    minWidth: 40,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },
});
