import React, { useState, useEffect } from 'react';
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

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
};

type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  date: any;
};

export const CalendarScreen: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('date', '>=', firestore.Timestamp.fromDate(startOfMonth))
      .where('date', '<=', firestore.Timestamp.fromDate(endOfMonth))
      .onSnapshot((snapshot) => {
        const txns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        setTransactions(txns);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user, currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getTransactionsForDate = (date: Date) => {
    return transactions.filter((txn) => {
      const txnDate = txn.date.toDate ? txn.date.toDate() : new Date(txn.date);
      return (
        txnDate.getDate() === date.getDate() &&
        txnDate.getMonth() === date.getMonth() &&
        txnDate.getFullYear() === date.getFullYear()
      );
    });
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
    const hasTransactions = dayTransactions.length > 0;
    const isSelected =
      selectedDate &&
      selectedDate.getDate() === date.getDate() &&
      selectedDate.getMonth() === date.getMonth();
    const isToday =
      new Date().getDate() === date.getDate() &&
      new Date().getMonth() === date.getMonth() &&
      new Date().getFullYear() === date.getFullYear();

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
          {date.getDate()}
        </Text>
        {hasTransactions && (
          <View style={styles.transactionIndicator}>
            <View style={styles.indicatorDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const selectedDateTransactions = selectedDate
    ? getTransactionsForDate(selectedDate)
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
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
          <ActivityIndicator size="large" color={brandColors.primaryBlue} />
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
          <ScrollView style={styles.transactionsList}>
            {selectedDateTransactions.length === 0 ? (
              <Text style={styles.noTransactions}>No transactions on this date</Text>
            ) : (
              selectedDateTransactions.map((txn) => (
                <View key={txn.id} style={styles.transactionItem}>
                  <Text style={styles.transactionName}>{txn.name}</Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      txn.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
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
    color: brandColors.primaryBlue,
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
    backgroundColor: brandColors.primaryBlue,
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: brandColors.primaryBlue,
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
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brandColors.green,
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
