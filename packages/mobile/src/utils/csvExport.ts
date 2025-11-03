// CSV Export Utility
import { Platform, Alert } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import firestore from '@react-native-firebase/firestore';

export type ExportPeriod = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'ytd';

export const EXPORT_PERIODS = [
  { value: 'this_month' as ExportPeriod, label: 'This Month' },
  { value: 'last_month' as ExportPeriod, label: 'Last Month' },
  { value: 'q1' as ExportPeriod, label: 'Q1 (Jan-Mar)' },
  { value: 'q2' as ExportPeriod, label: 'Q2 (Apr-Jun)' },
  { value: 'q3' as ExportPeriod, label: 'Q3 (Jul-Sep)' },
  { value: 'q4' as ExportPeriod, label: 'Q4 (Oct-Dec)' },
  { value: 'ytd' as ExportPeriod, label: 'Year to Date' },
];

// Get date range for export period
export const getDateRangeForPeriod = (period: ExportPeriod): { start: Date; end: Date } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (period) {
    case 'this_month':
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59),
      };

    case 'last_month':
      return {
        start: new Date(currentYear, currentMonth - 1, 1),
        end: new Date(currentYear, currentMonth, 0, 23, 59, 59),
      };

    case 'q1':
      return {
        start: new Date(currentYear, 0, 1),
        end: new Date(currentYear, 2, 31, 23, 59, 59),
      };

    case 'q2':
      return {
        start: new Date(currentYear, 3, 1),
        end: new Date(currentYear, 5, 30, 23, 59, 59),
      };

    case 'q3':
      return {
        start: new Date(currentYear, 6, 1),
        end: new Date(currentYear, 8, 30, 23, 59, 59),
      };

    case 'q4':
      return {
        start: new Date(currentYear, 9, 1),
        end: new Date(currentYear, 11, 31, 23, 59, 59),
      };

    case 'ytd':
      return {
        start: new Date(currentYear, 0, 1),
        end: now,
      };

    default:
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: now,
      };
  }
};

// Escape CSV field
export const escapeCSV = (field: any): string => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Convert array to CSV
export const arrayToCSV = (data: any[], headers: string[]): string => {
  const headerRow = headers.map(escapeCSV).join(',');
  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(',')
  );
  return [headerRow, ...rows].join('\n');
};

// Export transactions to CSV
export const exportTransactionsCSV = async (
  userId: string,
  period: ExportPeriod
): Promise<void> => {
  const { start, end } = getDateRangeForPeriod(period);

  // Fetch transactions from Firestore
  const snapshot = await firestore()
    .collection(`users/${userId}/transactions`)
    .where('date', '>=', firestore.Timestamp.fromDate(start))
    .where('date', '<=', firestore.Timestamp.fromDate(end))
    .orderBy('date', 'desc')
    .get();

  const transactions = snapshot.docs.map((doc) => {
    const data = doc.data();
    const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
    return {
      date: date.toLocaleDateString('en-US'),
      description: data.description || data.name || '',
      category: data.category || 'Uncategorized',
      type: data.type || 'expense',
      amount: Math.abs(data.amount).toFixed(2),
      account: data.accountName || '',
      pending: data.pending ? 'Yes' : 'No',
    };
  });

  const csv = arrayToCSV(transactions, [
    'date',
    'description',
    'category',
    'type',
    'amount',
    'account',
    'pending',
  ]);

  const periodLabel = EXPORT_PERIODS.find((p) => p.value === period)?.label || period;
  const fileName = `finch_transactions_${period}.csv`;

  // Write CSV directly to Downloads folder
  const downloadDir = Platform.OS === 'ios'
    ? ReactNativeBlobUtil.fs.dirs.DocumentDir
    : ReactNativeBlobUtil.fs.dirs.DownloadDir;

  const filePath = `${downloadDir}/${fileName}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, csv, 'utf8');

  // Show success message
  Alert.alert(
    'Export Successful',
    `File saved to ${Platform.OS === 'ios' ? 'Files' : 'Downloads'} folder:\n${fileName}`,
    [{ text: 'OK' }]
  );
};

// Export budget data to CSV
export const exportBudgetCSV = async (
  userId: string,
  period: ExportPeriod
): Promise<void> => {
  const { start, end } = getDateRangeForPeriod(period);

  // Fetch budgets
  const budgetSnapshot = await firestore()
    .collection(`users/${userId}/budgets`)
    .get();

  // Fetch transactions for the period to calculate spent amounts
  const transactionSnapshot = await firestore()
    .collection(`users/${userId}/transactions`)
    .where('date', '>=', firestore.Timestamp.fromDate(start))
    .where('date', '<=', firestore.Timestamp.fromDate(end))
    .where('type', '==', 'expense')
    .get();

  // Calculate spent by category
  const spentByCategory: { [key: string]: number } = {};
  transactionSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const category = data.category || 'Uncategorized';
    spentByCategory[category] = (spentByCategory[category] || 0) + Math.abs(data.amount);
  });

  const budgets = budgetSnapshot.docs.map((doc) => {
    const data = doc.data();
    const spent = spentByCategory[data.category] || 0;
    const remaining = data.limit - spent;
    const percentUsed = data.limit > 0 ? ((spent / data.limit) * 100).toFixed(1) : '0.0';

    return {
      category: data.category,
      budgetLimit: data.limit.toFixed(2),
      spent: spent.toFixed(2),
      remaining: remaining.toFixed(2),
      percentUsed: `${percentUsed}%`,
      status: spent > data.limit ? 'Over Budget' : 'Within Budget',
    };
  });

  const csv = arrayToCSV(budgets, [
    'category',
    'budgetLimit',
    'spent',
    'remaining',
    'percentUsed',
    'status',
  ]);

  const fileName = `finch_budget_${period}.csv`;

  // Write CSV directly to Downloads folder
  const downloadDir = Platform.OS === 'ios'
    ? ReactNativeBlobUtil.fs.dirs.DocumentDir
    : ReactNativeBlobUtil.fs.dirs.DownloadDir;

  const filePath = `${downloadDir}/${fileName}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, csv, 'utf8');

  // Show success message
  Alert.alert(
    'Export Successful',
    `File saved to ${Platform.OS === 'ios' ? 'Files' : 'Downloads'} folder:\n${fileName}`,
    [{ text: 'OK' }]
  );
};

// Export analytics/reports to CSV
export const exportAnalyticsCSV = async (
  userId: string,
  period: ExportPeriod
): Promise<void> => {
  const { start, end } = getDateRangeForPeriod(period);

  // Fetch all transactions for the period
  const snapshot = await firestore()
    .collection(`users/${userId}/transactions`)
    .where('date', '>=', firestore.Timestamp.fromDate(start))
    .where('date', '<=', firestore.Timestamp.fromDate(end))
    .orderBy('date', 'desc')
    .get();

  // Calculate analytics by category
  const categoryData: { [key: string]: { income: number; expenses: number; count: number } } = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const category = data.category || 'Uncategorized';
    const amount = Math.abs(data.amount);

    if (!categoryData[category]) {
      categoryData[category] = { income: 0, expenses: 0, count: 0 };
    }

    if (data.type === 'income') {
      categoryData[category].income += amount;
      totalIncome += amount;
    } else if (data.type === 'expense') {
      categoryData[category].expenses += amount;
      totalExpenses += amount;
    }

    categoryData[category].count += 1;
  });

  const analytics = Object.entries(categoryData).map(([category, data]) => {
    const net = data.income - data.expenses;
    const percentOfTotal = totalExpenses > 0
      ? ((data.expenses / totalExpenses) * 100).toFixed(1)
      : '0.0';

    return {
      category,
      income: data.income.toFixed(2),
      expenses: data.expenses.toFixed(2),
      net: net.toFixed(2),
      transactionCount: data.count,
      percentOfTotalExpenses: `${percentOfTotal}%`,
    };
  });

  // Add summary row
  analytics.push({
    category: 'TOTAL',
    income: totalIncome.toFixed(2),
    expenses: totalExpenses.toFixed(2),
    net: (totalIncome - totalExpenses).toFixed(2),
    transactionCount: snapshot.docs.length,
    percentOfTotalExpenses: '100.0%',
  });

  const csv = arrayToCSV(analytics, [
    'category',
    'income',
    'expenses',
    'net',
    'transactionCount',
    'percentOfTotalExpenses',
  ]);

  const fileName = `finch_analytics_${period}.csv`;

  // Write CSV directly to Downloads folder
  const downloadDir = Platform.OS === 'ios'
    ? ReactNativeBlobUtil.fs.dirs.DocumentDir
    : ReactNativeBlobUtil.fs.dirs.DownloadDir;

  const filePath = `${downloadDir}/${fileName}`;
  await ReactNativeBlobUtil.fs.writeFile(filePath, csv, 'utf8');

  // Show success message
  Alert.alert(
    'Export Successful',
    `File saved to ${Platform.OS === 'ios' ? 'Files' : 'Downloads'} folder:\n${fileName}`,
    [{ text: 'OK' }]
  );
};

// Export all data (combined)
export const exportAllDataCSV = async (
  userId: string,
  period: ExportPeriod
): Promise<void> => {
  await Promise.all([
    exportTransactionsCSV(userId, period),
    exportBudgetCSV(userId, period),
    exportAnalyticsCSV(userId, period),
  ]);
};
