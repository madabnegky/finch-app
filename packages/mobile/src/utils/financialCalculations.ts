// Financial Calculation Utilities
// Extracted from ReportsScreen for testability

export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  date: any;
};

export type KeyMetrics = {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
};

export type CategoryData = {
  name: string;
  amount: number;
  color: string;
};

export type MonthOverMonthComparison = {
  category: string;
  currentAmount: number;
  lastAmount: number;
  change: number;
  percentChange: number;
  color: string;
};

// Calculate key financial metrics
export const calculateKeyMetrics = (transactions: Transaction[]): KeyMetrics => {
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach((txn) => {
    const amount = Math.abs(txn.amount);
    if (txn.type === 'income') {
      totalIncome += amount;
    } else if (txn.type === 'expense') {
      totalExpenses += amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;

  return { totalIncome, totalExpenses, netSavings };
};

// Calculate spending by category
export const calculateSpendingByCategory = (
  transactions: Transaction[],
  categoryColors: { [key: string]: string }
): CategoryData[] => {
  const categoryTotals: { [key: string]: number } = {};

  transactions.forEach((txn) => {
    if (txn.type === 'expense') {
      const category = txn.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(txn.amount);
    }
  });

  return Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      color: categoryColors[name] || '#9CA3AF',
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Calculate month-over-month comparison
export const calculateMonthOverMonthComparison = (
  transactions: Transaction[],
  categoryColors: { [key: string]: string },
  currentDate: Date = new Date()
): MonthOverMonthComparison[] => {
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
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
      color: categoryColors[category] || '#9CA3AF',
    };
  });

  // Sort by absolute change (biggest changes first)
  return comparisons
    .filter(c => c.currentAmount > 0 || c.lastAmount > 0) // Only show categories with data
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5); // Top 5 biggest changes
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// Calculate percentage of total
export const calculatePercentage = (amount: number, total: number): number => {
  if (total === 0) return 0;
  return (amount / total) * 100;
};
