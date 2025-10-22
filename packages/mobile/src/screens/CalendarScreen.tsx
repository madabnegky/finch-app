import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { getInstancesInRange } from '../utils/transactionInstances';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';
import { actionIcons, categoryIcons } from '../theme/icons';

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  date: any;
  accountId?: string;
  category?: string;
  description?: string;
  instanceId?: string;
};

type Account = {
  id: string;
  name: string;
  currentBalance: number;
  cushion: number;
};

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Generate instances for the current month view + all past transactions
  const transactions = useMemo(() => {
    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const instances = getInstancesInRange(rawTransactions, twoYearsAgo, endOfMonth);
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

    // Fetch ALL transactions
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

  // Generate projections for the current month
  const monthProjections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() + 1, 0));

    const relevantAccounts = selectedAccountId === 'all'
      ? accounts
      : accounts.filter(acc => acc.id === selectedAccountId);

    const accountProjections = relevantAccounts.map(account => {
      let startingBalance = account.currentBalance;

      const pastInstances = transactions.filter(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        return inst.accountId === account.id && instDate < startOfMonth;
      });

      startingBalance += pastInstances.reduce((sum, inst) => sum + inst.amount, 0);

      const futureInstancesByDate = new Map();
      transactions.forEach(inst => {
        const instDate = inst.date instanceof Date ? inst.date : new Date(inst.date);
        const matchesAccount = inst.accountId === account.id;
        const afterStart = instDate >= startOfMonth;
        const beforeEnd = instDate <= endOfMonth;

        if (matchesAccount && afterStart && beforeEnd) {
          const dateKey = instDate.toISOString().split('T')[0];
          if (!futureInstancesByDate.has(dateKey)) {
            futureInstancesByDate.set(dateKey, []);
          }
          futureInstancesByDate.get(dateKey).push(inst);
        }
      });

      const projections = [];
      let currentBalance = startingBalance;

      for (let day = 1; day <= endOfMonth.getUTCDate(); day++) {
        const date = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), day));
        const dateKey = date.toISOString().split('T')[0];

        const transactionsToday = futureInstancesByDate.get(dateKey) || [];
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

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

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

  const getCategoryIcon = (category?: string): string => {
    if (!category) return categoryIcons.uncategorized;
    const normalized = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return categoryIcons[normalized as keyof typeof categoryIcons] || categoryIcons.uncategorized;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <View style={styles.container}>
      {/* CUSTOM HEADER */}
      <View style={styles.header}>
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
            <Text style={styles.headerTitle}>Calendar</Text>
            <Text style={styles.headerSubtitle}>Balance Projections</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ACCOUNT FILTER */}
        <View style={styles.accountFilterSection}>
          <Text style={styles.filterLabel}>View Account</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountScrollContent}
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

        {/* CALENDAR CARD */}
        <View style={styles.section}>
          <View style={styles.calendarCard}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                <Icon name={actionIcons.chevronLeft} size={24} color={brandColors.tealPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                <Icon name={actionIcons.chevronRight} size={24} color={brandColors.tealPrimary} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.weekHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <View key={`header-${idx}`} style={styles.weekDayCell}>
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
          </View>
        </View>

        {/* SELECTED DATE DETAILS */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.dateDetailsCard}>
              <View style={styles.dateHeader}>
                <Icon name="calendar-check" size={24} color={brandColors.tealPrimary} />
                <Text style={styles.dateTitle}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              {/* Balance Summary */}
              {selectedDateBalance && (
                <View style={styles.balanceSummaryContainer}>
                  <View style={styles.balanceRow}>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceLabel}>Projected Balance</Text>
                      <Text style={styles.balanceValue}>
                        {formatCurrency(selectedDateBalance.projectedBalance)}
                      </Text>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceLabel}>Cushion</Text>
                      <Text style={styles.balanceValue}>
                        {formatCurrency(selectedDateBalance.totalCushion)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.availableRow}>
                    <Text style={styles.availableLabel}>Available to Spend</Text>
                    <Text
                      style={[
                        styles.availableValue,
                        { color: selectedDateBalance.availableToSpend < 0 ? brandColors.error : brandColors.success }
                      ]}
                    >
                      {formatCurrency(selectedDateBalance.availableToSpend)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Transactions */}
              <View style={styles.transactionsSection}>
                <Text style={styles.transactionsSectionTitle}>
                  Transactions ({selectedDateTransactions.length})
                </Text>
                {selectedDateTransactions.length === 0 ? (
                  <View style={styles.noTransactionsContainer}>
                    <Icon name="calendar-blank" size={48} color={brandColors.textGray} />
                    <Text style={styles.noTransactionsText}>No transactions on this date</Text>
                  </View>
                ) : (
                  selectedDateTransactions.map((txn) => (
                    <View key={txn.id || txn.instanceId} style={styles.transactionItem}>
                      <View style={styles.transactionLeft}>
                        <View style={[
                          styles.transactionIconContainer,
                          { backgroundColor: txn.type === 'income' ? brandColors.success + '15' : brandColors.error + '15' }
                        ]}>
                          <Icon
                            name={getCategoryIcon(txn.category)}
                            size={20}
                            color={txn.type === 'income' ? brandColors.success : brandColors.error}
                          />
                        </View>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionName}>{txn.description || txn.name || 'Unnamed'}</Text>
                          {txn.category && (
                            <Text style={styles.transactionCategory}>{txn.category}</Text>
                          )}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: txn.type === 'income' ? brandColors.success : brandColors.error }
                        ]}
                      >
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.tealPrimary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 2,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },

  // Account Filter
  accountFilterSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  accountScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  accountChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.border,
  },
  accountChipActive: {
    backgroundColor: brandColors.orangeAccent,
    borderColor: brandColors.orangeAccent,
  },
  accountChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  accountChipTextActive: {
    color: brandColors.white,
  },

  // Calendar Card
  calendarCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    letterSpacing: -0.3,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textGray,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: brandColors.orangeAccent,
    borderRadius: 12,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: brandColors.tealPrimary,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  selectedDayText: {
    color: brandColors.white,
    fontWeight: '700',
  },
  todayText: {
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },
  transactionIndicator: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    gap: 3,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  incomeDot: {
    backgroundColor: brandColors.success,
  },
  expenseDot: {
    backgroundColor: brandColors.error,
  },

  // Date Details Card
  dateDetailsCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dateTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },

  // Balance Summary
  balanceSummaryContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  balanceRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: brandColors.border,
    marginHorizontal: 16,
  },
  availableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
    padding: 16,
    borderRadius: 12,
  },
  availableLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  availableValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // Transactions Section
  transactionsSection: {
  },
  transactionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  noTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTransactionsText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
