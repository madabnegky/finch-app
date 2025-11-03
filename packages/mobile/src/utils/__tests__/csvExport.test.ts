import { escapeCSV, arrayToCSV, getDateRangeForPeriod, EXPORT_PERIODS } from '../csvExport';

describe('CSV Export Utility', () => {
  describe('escapeCSV', () => {
    it('should return empty string for null or undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });

    it('should convert non-string values to strings', () => {
      expect(escapeCSV(123)).toBe('123');
      expect(escapeCSV(true)).toBe('true');
      expect(escapeCSV(false)).toBe('false');
    });

    it('should escape fields containing commas', () => {
      expect(escapeCSV('hello, world')).toBe('"hello, world"');
      expect(escapeCSV('one,two,three')).toBe('"one,two,three"');
    });

    it('should escape fields containing double quotes', () => {
      expect(escapeCSV('He said "hello"')).toBe('"He said ""hello"""');
      expect(escapeCSV('"quoted"')).toBe('"""quoted"""');
    });

    it('should escape fields containing newlines', () => {
      expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCSV('multi\nline\ntext')).toBe('"multi\nline\ntext"');
    });

    it('should escape fields with multiple special characters', () => {
      expect(escapeCSV('hello, "world"\nnew line')).toBe('"hello, ""world""\nnew line"');
    });

    it('should not escape simple strings', () => {
      expect(escapeCSV('hello')).toBe('hello');
      expect(escapeCSV('simple text')).toBe('simple text');
      expect(escapeCSV('123.45')).toBe('123.45');
    });
  });

  describe('arrayToCSV', () => {
    it('should convert empty array to header only', () => {
      const result = arrayToCSV([], ['name', 'age']);
      expect(result).toBe('name,age');
    });

    it('should convert simple data to CSV', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      const result = arrayToCSV(data, ['name', 'age']);
      expect(result).toBe('name,age\nJohn,30\nJane,25');
    });

    it('should handle missing fields', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane' }, // missing age
      ];
      const result = arrayToCSV(data, ['name', 'age']);
      expect(result).toBe('name,age\nJohn,30\nJane,');
    });

    it('should escape fields with commas', () => {
      const data = [
        { description: 'Coffee, Tea', amount: 10.50 },
      ];
      const result = arrayToCSV(data, ['description', 'amount']);
      expect(result).toBe('description,amount\n"Coffee, Tea",10.5');
    });

    it('should escape fields with quotes', () => {
      const data = [
        { description: 'The "Best" Coffee', amount: 5.00 },
      ];
      const result = arrayToCSV(data, ['description', 'amount']);
      expect(result).toBe('description,amount\n"The ""Best"" Coffee",5');
    });

    it('should handle transaction-like data', () => {
      const data = [
        {
          date: '11/1/2025',
          description: 'Starbucks Coffee',
          category: 'Food & Drink',
          type: 'expense',
          amount: '12.50',
          account: 'Chase Checking',
          pending: 'No',
        },
        {
          date: '11/2/2025',
          description: 'Salary, November',
          category: 'Income',
          type: 'income',
          amount: '5000.00',
          account: 'Chase Checking',
          pending: 'No',
        },
      ];
      const result = arrayToCSV(data, [
        'date',
        'description',
        'category',
        'type',
        'amount',
        'account',
        'pending',
      ]);

      const lines = result.split('\n');
      expect(lines[0]).toBe('date,description,category,type,amount,account,pending');
      expect(lines[1]).toBe('11/1/2025,Starbucks Coffee,Food & Drink,expense,12.50,Chase Checking,No');
      expect(lines[2]).toBe('11/2/2025,"Salary, November",Income,income,5000.00,Chase Checking,No');
    });
  });

  describe('getDateRangeForPeriod', () => {
    // Mock current date for consistent testing
    const mockDate = new Date('2025-11-03T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return correct range for this_month', () => {
      const { start, end } = getDateRangeForPeriod('this_month');
      expect(start).toEqual(new Date(2025, 10, 1)); // November 1
      expect(end).toEqual(new Date(2025, 11, 0, 23, 59, 59)); // November 30, 23:59:59
    });

    it('should return correct range for last_month', () => {
      const { start, end } = getDateRangeForPeriod('last_month');
      expect(start).toEqual(new Date(2025, 9, 1)); // October 1
      expect(end).toEqual(new Date(2025, 10, 0, 23, 59, 59)); // October 31, 23:59:59
    });

    it('should return correct range for q1', () => {
      const { start, end } = getDateRangeForPeriod('q1');
      expect(start).toEqual(new Date(2025, 0, 1)); // January 1
      expect(end).toEqual(new Date(2025, 2, 31, 23, 59, 59)); // March 31, 23:59:59
    });

    it('should return correct range for q2', () => {
      const { start, end } = getDateRangeForPeriod('q2');
      expect(start).toEqual(new Date(2025, 3, 1)); // April 1
      expect(end).toEqual(new Date(2025, 5, 30, 23, 59, 59)); // June 30, 23:59:59
    });

    it('should return correct range for q3', () => {
      const { start, end } = getDateRangeForPeriod('q3');
      expect(start).toEqual(new Date(2025, 6, 1)); // July 1
      expect(end).toEqual(new Date(2025, 8, 30, 23, 59, 59)); // September 30, 23:59:59
    });

    it('should return correct range for q4', () => {
      const { start, end } = getDateRangeForPeriod('q4');
      expect(start).toEqual(new Date(2025, 9, 1)); // October 1
      expect(end).toEqual(new Date(2025, 11, 31, 23, 59, 59)); // December 31, 23:59:59
    });

    it('should return correct range for ytd', () => {
      const { start, end } = getDateRangeForPeriod('ytd');
      expect(start).toEqual(new Date(2025, 0, 1)); // January 1
      expect(end).toEqual(mockDate); // Current date
    });

    it('should handle year boundary for last_month in January', () => {
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
      const { start, end } = getDateRangeForPeriod('last_month');
      expect(start).toEqual(new Date(2024, 11, 1)); // December 1, 2024
      expect(end).toEqual(new Date(2025, 0, 0, 23, 59, 59)); // December 31, 2024, 23:59:59
    });
  });

  describe('EXPORT_PERIODS constant', () => {
    it('should have all expected period options', () => {
      expect(EXPORT_PERIODS).toHaveLength(7);

      const values = EXPORT_PERIODS.map(p => p.value);
      expect(values).toEqual([
        'this_month',
        'last_month',
        'q1',
        'q2',
        'q3',
        'q4',
        'ytd',
      ]);
    });

    it('should have proper labels', () => {
      const labels = EXPORT_PERIODS.map(p => p.label);
      expect(labels).toEqual([
        'This Month',
        'Last Month',
        'Q1 (Jan-Mar)',
        'Q2 (Apr-Jun)',
        'Q3 (Jul-Sep)',
        'Q4 (Oct-Dec)',
        'Year to Date',
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings in escapeCSV', () => {
      const longString = 'a'.repeat(10000);
      expect(escapeCSV(longString)).toBe(longString);

      const longStringWithComma = 'a'.repeat(10000) + ',';
      expect(escapeCSV(longStringWithComma)).toBe(`"${longStringWithComma}"`);
    });

    it('should handle special characters in CSV', () => {
      const data = [
        { text: 'Tab\there', value: '1' },
        { text: 'Carriage\rReturn', value: '2' },
      ];
      const result = arrayToCSV(data, ['text', 'value']);
      expect(result).toContain('Tab\there');
      expect(result).toContain('Carriage\rReturn');
    });

    it('should handle numeric zero values', () => {
      expect(escapeCSV(0)).toBe('0');
      expect(escapeCSV(0.00)).toBe('0');

      const data = [{ amount: 0, count: 0 }];
      const result = arrayToCSV(data, ['amount', 'count']);
      expect(result).toBe('amount,count\n0,0');
    });

    it('should handle negative numbers', () => {
      const data = [
        { description: 'Credit', amount: -50.00 },
        { description: 'Debit', amount: 100.00 },
      ];
      const result = arrayToCSV(data, ['description', 'amount']);
      expect(result).toBe('description,amount\nCredit,-50\nDebit,100');
    });
  });
});
