import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { getInstancesInRange } from '../utils/transactionInstances';
import { brandColors } from '../theme/colors';

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  date: any;
  accountId?: string;
};

type Account = {
  id: string;
  name: string;
  currentBalance: number;
  cushion: number;
};

export const CalendarScreen: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]); // Series + one-time
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Generate instances for the current month view + all past transactions
  // We need past transactions for accurate balance calculations
  const transactions = useMemo(() => {
    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

    console.log(`[CALENDAR] currentDate: ${currentDate.toISOString()}, startOfMonth: ${startOfMonth.toISOString()}, endOfMonth: ${endOfMonth.toISOString()}`);

    // For balance calculations, we need all instances from way in the past to end of current month
    // Generate instances for 2 years back to cover all possible past transactions
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    console.log(`[CALENDAR] Calling getInstancesInRange with twoYearsAgo: ${twoYearsAgo.toISOString()}, endOfMonth: ${endOfMonth.toISOString()}`);
    const instances = getInstancesInRange(rawTransactions, twoYearsAgo, endOfMonth);
    console.log(`[CALENDAR] Generated ${instances.length} instances from ${rawTransactions.length} raw transactions`);
    const testRentInstances = instances.filter(i => (i.description || '').toLowerCase().includes('rent'));
    console.log(`  - TestRent instances: ${testRentInstances.length}`);
    testRentInstances.forEach(i => console.log(`    - Date: ${i.date}, amount: ${i.amount}, accountId: ${i.accountId}`));
    return instances;
  }, [rawTransactions, currentDate]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Fetch accounts
    const unsubscribeAccounts = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            setAccounts([]);
            return;
          }

          const accts = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || 'Unnamed Account',
            currentBalance: doc.data().currentBalance || 0,
            cushion: doc.data().cushion || 0,
          })) as Account[];
          setAccounts(accts);
        },
        (error) => {
          console.error('Error fetching accounts:', error);
          setAccounts([]);
        }
      );

    // Fetch ALL transactions (series + one-time), not just current month
    // Instance generation will handle filtering by date
    const unsubscribeTransactions = firestore()
      .collection(`users/${user.uid}/transactions`)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            setRawTransactions([]);
            setLoading(false);
            return;
          }

          const txns = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Transaction[];

          console.log(`[CALENDAR] Loaded ${txns.length} raw transactions from Firestore`);
          txns.forEach(t => console.log(`  - ${t.description || 'no desc'}, amount: ${t.amount}, accountId: ${t.accountId}, isRecurring: ${t.isRecurring}`));
          setRawTransactions(txns);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching transactions:', error);
          setRawTransactions([]);
          setLoading(false);
        }
      );

    return () => {
      unsubscribeAccounts();
      unsubscribeTransactions();
    };
  }, [user]);

  // Generate projections for the current month (mimicking Cloud Function logic)
  const monthProjections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

    // Filter accounts based on selection
    const relevantAccounts = selectedAccountId === 'all'
      ? accounts
      : accounts.filter(acc => acc.id === selectedAccountId);

    // Calculate starting balance for each account (current balance is already the "starting" balance)
    // We need to add all PAST instances (before start of month) to get the balance at start of month
    const accountProjections = relevantAccounts.map(account => {
      // Start with account's current balance
      let startingBalance = account.currentBalance;

      // Get all past instances for this account (before start of month)
      const pastInstances = transactions.filter(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        return inst.accountId === account.id && instDate < startOfMonth;
      });

      // Add past transactions to starting balance
      startingBalance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

      // Group future instances by date for this account
      const futureInstancesByDate = new Map();
      console.log(`[PROJECTION] Filtering ${transactions.length} transactions for account ${account.id}, startOfMonth: ${startOfMonth.toISOString()}, endOfMonth: ${endOfMonth.toISOString()}`);
      transactions.forEach(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        const matchesAccount = inst.accountId === account.id;
        const afterStart = instDate >= startOfMonth;
        const beforeEnd = instDate <= endOfMonth;

        if ((inst.description || '').toLowerCase().includes('rent')) {
          console.log(`[PROJECTION] TestRent check: instDate=${instDate.toISOString()}, accountId=${inst.accountId}, matchesAccount=${matchesAccount}, afterStart=${afterStart}, beforeEnd=${beforeEnd}`);
        }

        if (matchesAccount && afterStart && beforeEnd) {
          const dateKey = instDate.toISOString().split('T')[0];
          console.log(`[PROJECTION] Adding to futureInstancesByDate: ${inst.description || inst.name}, dateKey=${dateKey}, amount=${inst.amount}, accountId=${inst.accountId}`);
          if (!futureInstancesByDate.has(dateKey)) {
            futureInstancesByDate.set(dateKey, []);
          }
          futureInstancesByDate.get(dateKey).push(inst);
        }
      });

      // Build day-by-day projections with running balance
      const projections = [];
      let currentBalance = startingBalance;

      for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
        const date = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), day));
        const dateKey = date.toISOString().split('T')[0];

        const transactionsToday = futureInstancesByDate.get(dateKey) || [];
        if (transactionsToday.length > 0) {
          console.log(`[PROJECTION] Day ${day} (${dateKey}): ${transactionsToday.length} transactions`);
          transactionsToday.forEach(t => console.log(`  - ${t.description || t.name}: ${t.amount}`));
        }
        const dailyNet = transactionsToday.reduce((sum, t) => sum + t.amount, 0);
        currentBalance += dailyNet;

        projections.push({
          date,
          balance: currentBalance,
          transactions: transactionsToday,
        });
      }

      return { accountId: account.id, projections };
    });

    // Aggregate projections across all accounts by date
    const dailyTotals = new Map();
    accountProjections.forEach(({ accountId, projections: accountProj }) => {
      accountProj.forEach(dayProj => {
        const dateKey = dayProj.date.toISOString().split('T')[0];

        if (!dailyTotals.has(dateKey)) {
          dailyTotals.set(dateKey, {
            date: dayProj.date,
            totalBalance: 0,
            transactionsToday: [],
          });
        }
        dailyTotals.get(dateKey).totalBalance += dayProj.balance;

        // Add transactions without duplicates
        const existing = new Set(dailyTotals.get(dateKey).transactionsToday.map(t => t.id || t.instanceId));
        dayProj.transactions.forEach(t => {
          if (!existing.has(t.id || t.instanceId)) {
            dailyTotals.get(dateKey).transactionsToday.push(t);
          }
        });
      });
    });

    return dailyTotals;
  }, [accounts, transactions, currentDate, selectedAccountId]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const startDayOfWeek = firstDay.getUTCDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(Date.UTC(year, month, day)));
    }

    return days;
  };

  const getTransactionsForDate = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    const projection = monthProjections.get(dateKey);
    return projection?.transactionsToday || [];
  };

  // Calculate available balance for a specific date
  const calculateAvailableBalance = (targetDate: Date) => {
    const dateKey = targetDate.toISOString().split('T')[0];
    const projection = monthProjections.get(dateKey);

    if (!projection) {
      return {
        projectedBalance: 0,
        availableToSpend: 0,
        totalCushion: 0,
      };
    }

    const relevantAccounts = selectedAccountId === 'all'
      ? accounts
      : accounts.filter(acc => acc.id === selectedAccountId);

    const totalCushion = relevantAccounts.reduce((sum, acc) => sum + acc.cushion, 0);

    return {
      projectedBalance: projection.totalBalance,
      availableToSpend: projection.totalBalance - totalCushion,
      totalCushion,
    };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
    setSelectedDate(null);
  };

  const renderDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const dayTransactions = getTransactionsForDate(date);
    const hasIncome = dayTransactions.some(t => t.amount > 0);
    const hasExpenses = dayTransactions.some(t => t.amount < 0);
    const isSelected =
      selectedDate &&
      selectedDate.getUTCDate() === date.getUTCDate() &&
      selectedDate.getUTCMonth() === date.getUTCMonth();
    const today = new Date();
    const isToday =
      today.getUTCDate() === date.getUTCDate() &&
      today.getUTCMonth() === date.getUTCMonth() &&
      today.getUTCFullYear() === date.getUTCFullYear();

    return (
      <TouchableOpacity
        key={`day-${index}`}
        style={[
          styles.dayCell,
          isSelected && styles.selectedDay,
          isToday && styles.todayCell,
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text
          style={[
            styles.dayText,
            isSelected && styles.selectedDayText,
            isToday && styles.todayText,
          ]}
        >
          {date.getUTCDate()}
        </Text>
        {(hasIncome || hasExpenses) && (
          <View style={styles.transactionIndicator}>
            {hasIncome && <View style={[styles.indicatorDot, styles.incomeDot]} />}
            {hasExpenses && <View style={[styles.indicatorDot, styles.expenseDot]} />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const selectedDateTransactions = selectedDate
    ? getTransactionsForDate(selectedDate)
    : [];

  const selectedDateBalance = selectedDate
    ? calculateAvailableBalance(selectedDate)
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      {/* Account Filter */}
      <View style={styles.accountFilterContainer}>
        <Text style={styles.filterLabel}>Account:</Text>
        <View style={styles.scrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.accountScroll}
            contentContainerStyle={styles.scrollContent}
          >
            <TouchableOpacity
              style={[styles.accountChip, selectedAccountId === 'all' && styles.accountChipActive]}
              onPress={() => setSelectedAccountId('all')}
            >
              <Text style={[styles.accountChipText, selectedAccountId === 'all' && styles.accountChipTextActive]}>
                All Accounts
              </Text>
            </TouchableOpacity>
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[styles.accountChip, selectedAccountId === account.id && styles.accountChipActive]}
                onPress={() => setSelectedAccountId(account.id)}
              >
                <Text style={[styles.accountChipText, selectedAccountId === account.id && styles.accountChipTextActive]}>
                  {account.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Day of Week Headers */}
      <View style={styles.weekHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColors.tealPrimary} />
        </View>
      ) : (
        <View style={styles.calendarGrid}>
          {getDaysInMonth().map((date, index) => renderDay(date, index))}
        </View>
      )}

      {/* Selected Date Transactions */}
      {selectedDate && (
        <View style={styles.transactionsContainer}>
          <Text style={styles.transactionsTitle}>
            {selectedDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>

          {/* Daily Balance Summary */}
          {selectedDateBalance && (
            <View style={styles.balanceSummary}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Projected Balance:</Text>
                <Text style={styles.balanceValue}>
                  ${selectedDateBalance.projectedBalance.toFixed(2)}
                </Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Cushion:</Text>
                <Text style={styles.balanceValue}>
                  ${selectedDateBalance.totalCushion.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.balanceRow, styles.availableRow]}>
                <Text style={styles.availableLabel}>Available to Spend:</Text>
                <Text
                  style={[
                    styles.availableValue,
                    selectedDateBalance.availableToSpend < 0 && styles.negativeBalance,
                  ]}
                >
                  ${selectedDateBalance.availableToSpend.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.transactionsSectionTitle}>Transactions</Text>
          <ScrollView style={styles.transactionsList}>
            {selectedDateTransactions.length === 0 ? (
              <Text style={styles.noTransactions}>No transactions on this date</Text>
            ) : (
              selectedDateTransactions.map((txn) => (
                <View key={txn.id || txn.instanceId} style={styles.transactionItem}>
                  <Text style={styles.transactionName}>{txn.description || txn.name || 'Unnamed'}</Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {txn.type === 'income' ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </ScrollView>
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
  },
  accountFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginRight: 12,
    minWidth: 70,
  },
  scrollWrapper: {
    flex: 1,
  },
  accountScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingRight: 16,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: brandColors.backgroundOffWhite,
    marginRight: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  accountChipActive: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  accountChipTextActive: {
    color: brandColors.white,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: brandColors.white,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 24,
    color: brandColors.tealPrimary,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
    paddingVertical: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: brandColors.white,
    padding: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  selectedDay: {
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: brandColors.tealPrimary,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    color: brandColors.textDark,
  },
  selectedDayText: {
    color: brandColors.white,
    fontWeight: 'bold',
  },
  todayText: {
    fontWeight: 'bold',
  },
  transactionIndicator: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  incomeDot: {
    backgroundColor: brandColors.green,
  },
  expenseDot: {
    backgroundColor: brandColors.red,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionsContainer: {
    flex: 1,
    padding: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  balanceSummary: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  availableRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    marginBottom: 0,
  },
  availableLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  availableValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: brandColors.green,
  },
  negativeBalance: {
    color: brandColors.red,
  },
  transactionsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: brandColors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionName: {
    fontSize: 14,
    color: brandColors.textDark,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  incomeAmount: {
    color: brandColors.green,
  },
  expenseAmount: {
    color: brandColors.red,
  },
  noTransactions: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    marginTop: 20,
  },
});
