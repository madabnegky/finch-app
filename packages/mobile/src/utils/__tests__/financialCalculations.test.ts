import {
  calculateKeyMetrics,
  calculateSpendingByCategory,
  calculateMonthOverMonthComparison,
  formatCurrency,
  calculatePercentage,
  Transaction,
} from '../financialCalculations';

describe('Financial Calculations', () => {
  describe('calculateKeyMetrics', () => {
    it('should calculate metrics for empty transactions', () => {
      const result = calculateKeyMetrics([]);
      expect(result).toEqual({
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
      });
    });

    it('should calculate metrics with only income', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 1000, type: 'income', date: new Date() },
        { id: '2', amount: 500, type: 'income', date: new Date() },
      ];
      const result = calculateKeyMetrics(transactions);
      expect(result).toEqual({
        totalIncome: 1500,
        totalExpenses: 0,
        netSavings: 1500,
      });
    });

    it('should calculate metrics with only expenses', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'expense', category: 'Food', date: new Date() },
        { id: '2', amount: 50, type: 'expense', category: 'Transport', date: new Date() },
      ];
      const result = calculateKeyMetrics(transactions);
      expect(result).toEqual({
        totalIncome: 0,
        totalExpenses: 150,
        netSavings: -150,
      });
    });

    it('should calculate metrics with mixed income and expenses', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 5000, type: 'income', date: new Date() },
        { id: '2', amount: 1200, type: 'expense', category: 'Rent', date: new Date() },
        { id: '3', amount: 300, type: 'expense', category: 'Food', date: new Date() },
        { id: '4', amount: 200, type: 'income', date: new Date() },
      ];
      const result = calculateKeyMetrics(transactions);
      expect(result).toEqual({
        totalIncome: 5200,
        totalExpenses: 1500,
        netSavings: 3700,
      });
    });

    it('should handle negative amounts (use absolute values)', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: -100, type: 'expense', category: 'Food', date: new Date() },
        { id: '2', amount: -50, type: 'income', date: new Date() },
      ];
      const result = calculateKeyMetrics(transactions);
      expect(result).toEqual({
        totalIncome: 50,
        totalExpenses: 100,
        netSavings: -50,
      });
    });

    it('should handle decimal amounts', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 123.45, type: 'income', date: new Date() },
        { id: '2', amount: 67.89, type: 'expense', category: 'Coffee', date: new Date() },
      ];
      const result = calculateKeyMetrics(transactions);
      expect(result.totalIncome).toBeCloseTo(123.45);
      expect(result.totalExpenses).toBeCloseTo(67.89);
      expect(result.netSavings).toBeCloseTo(55.56);
    });
  });

  describe('calculateSpendingByCategory', () => {
    const categoryColors = {
      'Food': '#FF6B6B',
      'Transport': '#4ECDC4',
      'Housing': '#45B7D1',
    };

    it('should return empty array for no expenses', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 1000, type: 'income', date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);
      expect(result).toEqual([]);
    });

    it('should calculate spending by category', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'expense', category: 'Food', date: new Date() },
        { id: '2', amount: 50, type: 'expense', category: 'Food', date: new Date() },
        { id: '3', amount: 200, type: 'expense', category: 'Transport', date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Transport', amount: 200, color: '#4ECDC4' });
      expect(result[1]).toEqual({ name: 'Food', amount: 150, color: '#FF6B6B' });
    });

    it('should sort categories by amount (highest first)', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 50, type: 'expense', category: 'Food', date: new Date() },
        { id: '2', amount: 1200, type: 'expense', category: 'Housing', date: new Date() },
        { id: '3', amount: 200, type: 'expense', category: 'Transport', date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);

      expect(result.map(c => c.name)).toEqual(['Housing', 'Transport', 'Food']);
      expect(result.map(c => c.amount)).toEqual([1200, 200, 50]);
    });

    it('should handle uncategorized transactions', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'expense', date: new Date() },
        { id: '2', amount: 50, type: 'expense', category: undefined, date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Uncategorized');
      expect(result[0].amount).toBe(150);
    });

    it('should use default color for unknown categories', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'expense', category: 'Unknown', date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);

      expect(result[0].color).toBe('#9CA3AF');
    });

    it('should ignore income transactions', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'expense', category: 'Food', date: new Date() },
        { id: '2', amount: 1000, type: 'income', category: 'Food', date: new Date() },
      ];
      const result = calculateSpendingByCategory(transactions, categoryColors);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
    });
  });

  describe('calculateMonthOverMonthComparison', () => {
    const categoryColors = {
      'Food': '#FF6B6B',
      'Transport': '#4ECDC4',
      'Housing': '#45B7D1',
    };

    // Mock current date for consistent testing
    const mockDate = new Date('2025-11-15T12:00:00Z');

    it('should return empty array when no expense transactions', () => {
      const transactions: Transaction[] = [];
      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);
      expect(result).toEqual([]);
    });

    it('should calculate month-over-month changes', () => {
      const transactions: Transaction[] = [
        // Current month (November 2025)
        { id: '1', amount: 150, type: 'expense', category: 'Food', date: new Date('2025-11-10') },
        { id: '2', amount: 50, type: 'expense', category: 'Food', date: new Date('2025-11-12') },

        // Last month (October 2025)
        { id: '3', amount: 100, type: 'expense', category: 'Food', date: new Date('2025-10-15') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
      expect(result[0].currentAmount).toBe(200);
      expect(result[0].lastAmount).toBe(100);
      expect(result[0].change).toBe(100);
      expect(result[0].percentChange).toBe(100); // 100% increase
    });

    it('should calculate percentage decrease correctly', () => {
      const transactions: Transaction[] = [
        // Current month - less spending
        { id: '1', amount: 50, type: 'expense', category: 'Transport', date: new Date('2025-11-10') },

        // Last month - more spending
        { id: '2', amount: 200, type: 'expense', category: 'Transport', date: new Date('2025-10-15') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);

      expect(result[0].change).toBe(-150);
      expect(result[0].percentChange).toBe(-75); // 75% decrease
    });

    it('should handle new categories (100% increase)', () => {
      const transactions: Transaction[] = [
        // Current month - new category
        { id: '1', amount: 100, type: 'expense', category: 'Entertainment', date: new Date('2025-11-10') },

        // Last month - no Entertainment spending
        { id: '2', amount: 50, type: 'expense', category: 'Food', date: new Date('2025-10-15') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);

      const entertainment = result.find(c => c.category === 'Entertainment');
      expect(entertainment?.percentChange).toBe(100);
    });

    it('should sort by absolute change (largest changes first)', () => {
      const transactions: Transaction[] = [
        // Food: +50 change
        { id: '1', amount: 150, type: 'expense', category: 'Food', date: new Date('2025-11-10') },
        { id: '2', amount: 100, type: 'expense', category: 'Food', date: new Date('2025-10-15') },

        // Transport: -100 change (larger absolute)
        { id: '3', amount: 50, type: 'expense', category: 'Transport', date: new Date('2025-11-10') },
        { id: '4', amount: 150, type: 'expense', category: 'Transport', date: new Date('2025-10-15') },

        // Housing: +10 change (smallest)
        { id: '5', amount: 1210, type: 'expense', category: 'Housing', date: new Date('2025-11-10') },
        { id: '6', amount: 1200, type: 'expense', category: 'Housing', date: new Date('2025-10-15') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);

      expect(result.map(c => c.category)).toEqual(['Transport', 'Food', 'Housing']);
      expect(result.map(c => Math.abs(c.change))).toEqual([100, 50, 10]);
    });

    it('should limit to top 5 categories', () => {
      const transactions: Transaction[] = [];

      // Create 7 different categories
      for (let i = 1; i <= 7; i++) {
        transactions.push({
          id: `current-${i}`,
          amount: i * 10,
          type: 'expense',
          category: `Category${i}`,
          date: new Date('2025-11-10'),
        });
        transactions.push({
          id: `last-${i}`,
          amount: 5,
          type: 'expense',
          category: `Category${i}`,
          date: new Date('2025-10-15'),
        });
      }

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);
      expect(result).toHaveLength(5);
    });

    it('should ignore income transactions', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, type: 'income', category: 'Salary', date: new Date('2025-11-10') },
        { id: '2', amount: 50, type: 'expense', category: 'Food', date: new Date('2025-11-10') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, mockDate);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
    });

    it('should handle year boundary correctly', () => {
      const janDate = new Date('2025-01-15T12:00:00Z');
      const transactions: Transaction[] = [
        // January 2025
        { id: '1', amount: 100, type: 'expense', category: 'Food', date: new Date('2025-01-10') },

        // December 2024
        { id: '2', amount: 50, type: 'expense', category: 'Food', date: new Date('2024-12-15') },
      ];

      const result = calculateMonthOverMonthComparison(transactions, categoryColors, janDate);

      expect(result).toHaveLength(1);
      expect(result[0].currentAmount).toBe(100);
      expect(result[0].lastAmount).toBe(50);
    });
  });

  describe('formatCurrency', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-100)).toBe('-$100.00');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format large amounts with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should round to two decimal places', () => {
      expect(formatCurrency(10.12345)).toBe('$10.12');
      expect(formatCurrency(10.999)).toBe('$11.00');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(100, 200)).toBe(50);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
      expect(calculatePercentage(0, 0)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculatePercentage(33.33, 100)).toBeCloseTo(33.33);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1);
    });

    it('should handle percentages over 100', () => {
      expect(calculatePercentage(150, 100)).toBe(150);
      expect(calculatePercentage(200, 50)).toBe(400);
    });

    it('should handle very small amounts', () => {
      expect(calculatePercentage(0.01, 1)).toBe(1);
      expect(calculatePercentage(0.001, 1)).toBeCloseTo(0.1);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle transactions with Firestore timestamp dates', () => {
      const transactions: Transaction[] = [
        {
          id: '1',
          amount: 100,
          type: 'expense',
          category: 'Food',
          date: { toDate: () => new Date('2025-11-10') },
        },
        {
          id: '2',
          amount: 50,
          type: 'expense',
          category: 'Food',
          date: { toDate: () => new Date('2025-10-15') },
        },
      ];

      const result = calculateMonthOverMonthComparison(
        transactions,
        { 'Food': '#FF6B6B' },
        new Date('2025-11-15')
      );

      expect(result).toHaveLength(1);
      expect(result[0].currentAmount).toBe(100);
      expect(result[0].lastAmount).toBe(50);
    });

    it('should handle realistic monthly budget scenario', () => {
      const transactions: Transaction[] = [
        // Income
        { id: '1', amount: 5000, type: 'income', date: new Date() },

        // Expenses
        { id: '2', amount: 1200, type: 'expense', category: 'Housing', date: new Date() },
        { id: '3', amount: 400, type: 'expense', category: 'Food', date: new Date() },
        { id: '4', amount: 150, type: 'expense', category: 'Transport', date: new Date() },
        { id: '5', amount: 100, type: 'expense', category: 'Entertainment', date: new Date() },
        { id: '6', amount: 200, type: 'expense', category: 'Utilities', date: new Date() },
      ];

      const metrics = calculateKeyMetrics(transactions);
      expect(metrics.totalIncome).toBe(5000);
      expect(metrics.totalExpenses).toBe(2050);
      expect(metrics.netSavings).toBe(2950);

      const categoryData = calculateSpendingByCategory(transactions, {});
      expect(categoryData).toHaveLength(5);
      expect(categoryData[0].name).toBe('Housing'); // Highest expense
      expect(categoryData[0].amount).toBe(1200);
    });
  });
});
