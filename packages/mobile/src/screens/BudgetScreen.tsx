import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';
import { categoryIcons, actionIcons } from '../theme/icons';
import { Budget as BudgetType, Transaction as TransactionType, toDate, UserProfile } from '../types';
import { validateBudgetLimit, formatCurrency as formatCurrencyUtil, isFullyAutoManaged, isPartiallyAutoManaged, getBudgetStatusDescription } from '../utils/budgetValidation';
import { hasPremiumAccess, PREMIUM_FEATURES } from '../utils/premiumAccess';
import { PremiumUpgradeModal } from '../components/PremiumUpgradeModal';

const EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Groceries',
  'Shopping',
  'Health',
  'Subscriptions',
  'Utilities',
  'Personal Care',
  'Travel',
  'Gifts & Donations',
  'Entertainment',
  'Uncategorized',
];

// Use the centralized types, but keep these aliases for backward compatibility
type Budget = BudgetType;
type Transaction = TransactionType;

export const BudgetScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [historicalTransactions, setHistoricalTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Track which budgets have been alerted at which threshold to avoid duplicate notifications
  const alertedBudgets = useRef<{ [key: string]: { '80': boolean; '90': boolean; '100': boolean } }>({});

  // Check premium access
  const isPremium = hasPremiumAccess(userProfile, user?.uid);

  // Fetch budgets
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/budgets`)
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            setBudgets([]);
            setLoading(false);
            return;
          }

          const budgetData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              category: data.category,
              limit: data.limit,
              spent: 0,
              // New fields with defaults for backward compatibility
              autoManagedAmount: data.autoManagedAmount || 0,
              discretionaryAmount: data.discretionaryAmount || data.limit || 0,
              linkedRecurringTransactions: data.linkedRecurringTransactions || [],
              isAutoManaged: data.isAutoManaged || false,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              userId: data.userId || user!.uid,
            };
          });

          setBudgets(budgetData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching budgets:', error);
          setBudgets([]);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Calculate spent amount for each budget
  useEffect(() => {
    if (!user || budgets.length === 0) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Simplified query - just filter by date, then filter by type in code
    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('date', '>=', firestore.Timestamp.fromDate(startOfMonth))
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            return;
          }

          const transactions = snapshot.docs
            .map((doc) => doc.data() as Transaction)
            .filter((txn) => {
              // Filter by type and date range in memory
              if (txn.type !== 'expense') return false;
              const txnDate = toDate(txn.date);
              // Only count transactions that have actually occurred (date <= now)
              return txnDate >= startOfMonth && txnDate <= endOfMonth && txnDate <= now;
            });

          const categorySpending: { [key: string]: number } = {};
          transactions.forEach((txn) => {
            const category = txn.category || 'Uncategorized';
            categorySpending[category] = (categorySpending[category] || 0) + Math.abs(txn.amount);
          });

          setBudgets((prevBudgets) =>
            prevBudgets.map((budget) => ({
              ...budget,
              spent: categorySpending[budget.category] || 0,
            }))
          );
        },
        (error) => {
          console.error('Error fetching transactions for budget:', error);
        }
      );

    return () => unsubscribe();
  }, [user, budgets.length]);

  // Check budget thresholds and send alerts
  useEffect(() => {
    if (budgets.length === 0) return;

    // Collect all alerts to show in a single consolidated message
    const alertsToShow: Array<{ budget: Budget; threshold: number; percentage: number }> = [];

    budgets.forEach((budget) => {
      const percentage = (budget.spent / budget.limit) * 100;
      const budgetKey = `${budget.id}-${budget.category}`;

      // Initialize tracking for this budget if not exists
      if (!alertedBudgets.current[budgetKey]) {
        alertedBudgets.current[budgetKey] = { '80': false, '90': false, '100': false };
      }

      // Check 80% threshold
      if (percentage >= 80 && percentage < 90 && !alertedBudgets.current[budgetKey]['80']) {
        alertedBudgets.current[budgetKey]['80'] = true;
        alertsToShow.push({ budget, threshold: 80, percentage });
      }

      // Check 90% threshold
      if (percentage >= 90 && percentage < 100 && !alertedBudgets.current[budgetKey]['90']) {
        alertedBudgets.current[budgetKey]['90'] = true;
        alertsToShow.push({ budget, threshold: 90, percentage });
      }

      // Check 100% threshold - only alert when EXCEEDED (> 100), not equal
      if (percentage > 100 && !alertedBudgets.current[budgetKey]['100']) {
        alertedBudgets.current[budgetKey]['100'] = true;
        alertsToShow.push({ budget, threshold: 100, percentage });
      }
    });

    // Show consolidated alert if there are any alerts
    if (alertsToShow.length > 0) {
      sendConsolidatedBudgetAlert(alertsToShow);
    }
  }, [budgets]);

  // Send consolidated budget alert notification
  const sendConsolidatedBudgetAlert = async (
    alerts: Array<{ budget: Budget; threshold: number; percentage: number }>
  ) => {
    const formatCurrencyLocal = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Sort alerts by severity (100 > 90 > 80)
    const sortedAlerts = alerts.sort((a, b) => b.threshold - a.threshold);

    // Build consolidated message
    let title = '';
    if (sortedAlerts.length === 1) {
      // Single alert - use specific title
      const alert = sortedAlerts[0];
      if (alert.threshold === 80) {
        title = `Budget Alert: ${alert.budget.category}`;
      } else if (alert.threshold === 90) {
        title = `Budget Warning: ${alert.budget.category}`;
      } else {
        title = `Budget Exceeded: ${alert.budget.category}`;
      }
    } else {
      // Multiple alerts - use generic title
      title = 'Budget Alerts';
    }

    // Build body with all alerts
    const alertMessages = sortedAlerts.map((alert) => {
      const { budget, threshold, percentage } = alert;
      if (threshold === 80) {
        return `• ${budget.category}: ${percentage.toFixed(0)}% used (${formatCurrencyLocal(budget.spent)} of ${formatCurrencyLocal(budget.limit)})`;
      } else if (threshold === 90) {
        return `• ${budget.category}: ${percentage.toFixed(0)}% used (${formatCurrencyLocal(budget.spent)} of ${formatCurrencyLocal(budget.limit)})`;
      } else {
        return `• ${budget.category}: EXCEEDED by ${formatCurrencyLocal(budget.spent - budget.limit)} (${formatCurrencyLocal(budget.spent)} of ${formatCurrencyLocal(budget.limit)})`;
      }
    });

    const body = alertMessages.join('\n');

    // Show local notification using Alert for now (can be upgraded to push notifications)
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // Try to request notification permissions and send local notification
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          // For local in-app alerts, we'll use Alert
          // In production, you'd want to use a proper notification library like @notifee/react-native
          Alert.alert(title, body, [{ text: 'OK', style: 'default' }]);
        }
      } catch (error) {
        console.error('Error sending budget notification:', error);
        // Fallback to simple alert
        Alert.alert(title, body, [{ text: 'OK', style: 'default' }]);
      }
    }
  };

  // Fetch historical transactions for budget performance comparison
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('date', '>=', firestore.Timestamp.fromDate(lastMonthStart))
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            setHistoricalTransactions([]);
            return;
          }

          const transactions = snapshot.docs.map((doc) => doc.data() as Transaction);
          setHistoricalTransactions(transactions);
        },
        (error) => {
          console.error('Error fetching historical transactions:', error);
        }
      );

    return () => unsubscribe();
  }, [user]);

  // Fetch user profile for premium status
  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setUserProfile(doc.data() as UserProfile);
        }
      });

    return unsubscribe;
  }, [user]);

  // Premium gate check - show upgrade modal if not premium and trying to access budgets
  useEffect(() => {
    if (user && userProfile && !isPremium) {
      // Show a subtle banner or modal indicating premium feature
      console.log('💎 Budgets is a premium feature');
    }
  }, [user, userProfile, isPremium]);

  // Calculate budget performance (month-over-month)
  const getBudgetPerformance = useMemo(() => {
    if (budgets.length === 0 || historicalTransactions.length === 0) return [];

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Calculate spending by category for current and last month
    const currentMonthSpending: { [key: string]: number } = {};
    const lastMonthSpending: { [key: string]: number } = {};

    historicalTransactions.forEach((txn) => {
      if (txn.type !== 'expense') return;

      const txnDate = toDate(txn.date);
      const category = txn.category || 'Uncategorized';
      const amount = Math.abs(txn.amount);

      if (txnDate >= currentMonthStart) {
        currentMonthSpending[category] = (currentMonthSpending[category] || 0) + amount;
      } else if (txnDate >= lastMonthStart && txnDate <= lastMonthEnd) {
        lastMonthSpending[category] = (lastMonthSpending[category] || 0) + amount;
      }
    });

    // Build performance data for each budget
    const performanceData = budgets.map((budget) => {
      const currentSpent = currentMonthSpending[budget.category] || 0;
      const lastSpent = lastMonthSpending[budget.category] || 0;
      const currentPercentage = budget.limit > 0 ? (currentSpent / budget.limit) * 100 : 0;
      const lastPercentage = budget.limit > 0 ? (lastSpent / budget.limit) * 100 : 0;

      // Determine status
      const getCurrentStatus = (percentage: number) => {
        if (percentage > 100) return 'over';
        if (percentage >= 80) return 'approaching';
        return 'under';
      };

      return {
        category: budget.category,
        budgetLimit: budget.limit,
        currentMonthSpent: currentSpent,
        lastMonthSpent: lastSpent,
        currentMonthPercentage: Math.round(currentPercentage),
        lastMonthPercentage: Math.round(lastPercentage),
        currentMonthStatus: getCurrentStatus(currentPercentage),
        lastMonthStatus: getCurrentStatus(lastPercentage),
      };
    });

    // Sort by current month percentage (highest first)
    return performanceData.sort((a, b) => b.currentMonthPercentage - a.currentMonthPercentage);
  }, [budgets, historicalTransactions]);

  const handleAddBudget = async () => {
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a category');
      return;
    }

    if (!limitAmount || parseFloat(limitAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid budget limit');
      return;
    }

    if (budgets.some((b) => b.category === selectedCategory)) {
      Alert.alert('Error', 'Budget already exists for this category');
      return;
    }

    try {
      setSaving(true);

      await firestore()
        .collection(`users/${user?.uid}/budgets`)
        .add({
          category: selectedCategory,
          limit: parseFloat(limitAmount),
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      setShowAddModal(false);
      setSelectedCategory('');
      setLimitAmount('');
      Alert.alert('Success', 'Budget added successfully');
    } catch (error) {
      console.error('Error adding budget:', error);
      Alert.alert('Error', 'Failed to add budget');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBudget = async () => {
    if (!editingBudget) return;

    const newLimit = parseFloat(limitAmount);

    if (!limitAmount || newLimit <= 0) {
      Alert.alert('Required', 'Please enter a valid budget limit');
      return;
    }

    // Validate against auto-managed floor
    const validation = validateBudgetLimit(
      newLimit,
      editingBudget.autoManagedAmount,
      editingBudget.linkedRecurringTransactions
    );

    if (!validation.valid) {
      Alert.alert('Cannot Reduce Budget', validation.message || 'Budget is below the minimum required amount');
      return;
    }

    try {
      setSaving(true);

      const discretionaryAmount = newLimit - editingBudget.autoManagedAmount;

      await firestore()
        .collection(`users/${user?.uid}/budgets`)
        .doc(editingBudget.id)
        .update({
          limit: newLimit,
          discretionaryAmount,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      setShowEditModal(false);
      setEditingBudget(null);
      setLimitAmount('');
      Alert.alert('Success', 'Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      Alert.alert('Error', 'Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setLimitAmount(budget.limit.toString());
    setShowEditModal(true);
  };

  const handleDeleteBudget = async (budgetId: string, category: string) => {
    Alert.alert('Delete Budget', `Are you sure you want to delete the ${category} budget?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection(`users/${user?.uid}/budgets`)
              .doc(budgetId)
              .delete();
            Alert.alert('Success', 'Budget deleted successfully');
          } catch (error) {
            console.error('Error deleting budget:', error);
            Alert.alert('Error', 'Failed to delete budget');
          }
        },
      },
    ]);
  };

  const getProgressColor = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return brandColors.error;
    if (percentage >= 80) return brandColors.orangeAccent;
    return brandColors.success;
  };

  const getCategoryIcon = (category: string): string => {
    const normalized = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return categoryIcons[normalized as keyof typeof categoryIcons] || categoryIcons.uncategorized;
  };

  // Budget summary calculations
  const budgetSummary = useMemo(() => {
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const overallPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    return { totalBudgeted, totalSpent, totalRemaining, overallPercentage };
  }, [budgets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Animated Progress Bar Component
  const AnimatedProgressBar: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(animatedWidth, {
        toValue: Math.min(percentage, 100),
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start();
    }, [percentage]);

    const width = animatedWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary} />
      </View>
    );
  }

  const availableCategories = EXPENSE_CATEGORIES.filter(
    (cat) => !budgets.some((b) => b.category === cat)
  );

  const renderBudget = (budget: Budget) => {
    const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
    const remaining = Math.max(budget.limit - budget.spent, 0);
    const isOverBudget = budget.spent > budget.limit;
    const progressColor = getProgressColor(budget.spent, budget.limit);

    return (
      <View key={budget.id} style={styles.budgetCard}>
        <View style={styles.budgetCardHeader}>
          <View style={styles.budgetLeft}>
            <View style={[styles.categoryIconContainer, { backgroundColor: progressColor + '15' }]}>
              <Icon
                name={getCategoryIcon(budget.category)}
                size={24}
                color={progressColor}
              />
            </View>
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetCategory}>{budget.category}</Text>
              <Text style={[styles.budgetRemaining, { color: isOverBudget ? brandColors.error : brandColors.success }]}>
                {isOverBudget ? `Over by ${formatCurrency(budget.spent - budget.limit)}` : `${formatCurrency(remaining)} left`}
              </Text>
            </View>
          </View>
          <View style={styles.budgetActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(budget)}
            >
              <Icon name="pencil" size={20} color={brandColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteBudget(budget.id, budget.category)}
            >
              <Icon name={actionIcons.delete} size={20} color={brandColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.budgetAmounts}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={styles.budgetSpent}>{formatCurrency(budget.spent)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Budget</Text>
            <Text style={styles.budgetLimit}>{formatCurrency(budget.limit)}</Text>
          </View>
        </View>

        {/* Budget Breakdown - Show if auto-managed */}
        {budget.isAutoManaged && budget.autoManagedAmount > 0 && (
          <View style={styles.budgetBreakdown}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelContainer}>
                <Icon name="sync" size={12} color={brandColors.primary} />
                <Text style={styles.breakdownLabel}>Auto-managed</Text>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(budget.autoManagedAmount)}</Text>
            </View>
            {budget.discretionaryAmount > 0 && (
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelContainer}>
                  <Icon name="hand-coin-outline" size={12} color={brandColors.textSecondary} />
                  <Text style={styles.breakdownLabel}>Discretionary</Text>
                </View>
                <Text style={styles.breakdownAmount}>{formatCurrency(budget.discretionaryAmount)}</Text>
              </View>
            )}
            {budget.linkedRecurringTransactions.length > 0 && (
              <Text style={styles.breakdownHint}>
                {budget.linkedRecurringTransactions.length} recurring transaction{budget.linkedRecurringTransactions.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}

        <AnimatedProgressBar percentage={percentage} color={progressColor} />

        <View style={styles.budgetFooter}>
          <Text style={[styles.budgetPercentage, { color: progressColor }]}>
            {percentage.toFixed(0)}% used
          </Text>
          {percentage >= 80 && (
            <View style={[styles.warningBadge, { backgroundColor: progressColor }]}>
              <Icon name="alert-circle" size={14} color={brandColors.white} />
              <Text style={styles.warningBadgeText}>
                {percentage >= 100 ? 'Over Budget' : percentage >= 90 ? 'Critical' : 'Warning'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
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
            <Icon name="menu" size={24} color={brandColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <FinchLogo size={32} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Budget</Text>
            <Text style={styles.headerSubtitle}>Monthly Spending Limits</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* SUMMARY CARD */}
        {budgets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Icon name="chart-pie" size={24} color={brandColors.primary} />
                <Text style={styles.summaryTitle}>Budget Overview</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Budgeted</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(budgetSummary.totalBudgeted)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(budgetSummary.totalSpent)}</Text>
                </View>
              </View>

              <View style={styles.summaryProgressContainer}>
                <AnimatedProgressBar
                  percentage={budgetSummary.overallPercentage}
                  color={getProgressColor(budgetSummary.totalSpent, budgetSummary.totalBudgeted)}
                />
              </View>

              <View style={styles.summaryFooter}>
                <Text style={styles.summaryRemainingLabel}>Remaining this month</Text>
                <Text style={[
                  styles.summaryRemainingValue,
                  { color: budgetSummary.totalRemaining >= 0 ? brandColors.success : brandColors.error }
                ]}>
                  {formatCurrency(budgetSummary.totalRemaining)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BUDGETS LIST */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Categories</Text>
            {budgets.length > 0 && (
              <Text style={styles.budgetCount}>{budgets.length} active</Text>
            )}
          </View>

          {budgets.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="wallet-outline" size={64} color={brandColors.textGray} />
              </View>
              <Text style={styles.emptyStateText}>No budgets yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first budget to start tracking your spending by category
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowAddModal(true)}
              >
                <Icon name={actionIcons.add} size={20} color={brandColors.white} />
                <Text style={styles.emptyStateButtonText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          ) : (
            budgets.map(renderBudget)
          )}
        </View>

        {/* BUDGET PERFORMANCE HISTORY */}
        {getBudgetPerformance.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Budget Performance</Text>
              <Text style={styles.sectionSubtitle}>This month vs. last month</Text>
            </View>

            {getBudgetPerformance.map((performance) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'over':
                    return brandColors.error;
                  case 'approaching':
                    return brandColors.warning;
                  default:
                    return brandColors.success;
                }
              };

              return (
                <View key={performance.category} style={styles.performanceCard}>
                  <View style={styles.performanceHeader}>
                    <View style={styles.performanceCategoryContainer}>
                      <View style={styles.performanceIconContainer}>
                        <Icon
                          name={getCategoryIcon(performance.category)}
                          size={20}
                          color={brandColors.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.performanceCategory}>{performance.category}</Text>
                        <Text style={styles.performanceBudget}>
                          Budget: {formatCurrency(performance.budgetLimit)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.performanceComparison}>
                    {/* Current Month */}
                    <View style={styles.performanceMonth}>
                      <Text style={styles.performanceMonthLabel}>This Month</Text>
                      <Text style={styles.performanceAmount}>
                        {formatCurrency(performance.currentMonthSpent)}
                      </Text>
                      <View style={styles.performanceBarContainer}>
                        <View
                          style={[
                            styles.performanceBar,
                            {
                              width: `${Math.min(performance.currentMonthPercentage, 100)}%`,
                              backgroundColor: getStatusColor(performance.currentMonthStatus),
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.performanceStats}>
                        <Text
                          style={[
                            styles.performancePercent,
                            { color: getStatusColor(performance.currentMonthStatus) },
                          ]}
                        >
                          {performance.currentMonthPercentage}%
                        </Text>
                        {performance.currentMonthStatus === 'over' && (
                          <Text style={styles.performanceStatusText}>Over Budget</Text>
                        )}
                        {performance.currentMonthStatus === 'approaching' && (
                          <Text style={styles.performanceStatusText}>Approaching</Text>
                        )}
                      </View>
                    </View>

                    {/* Last Month */}
                    <View style={styles.performanceMonth}>
                      <Text style={styles.performanceMonthLabel}>Last Month</Text>
                      <Text style={styles.performanceAmount}>
                        {formatCurrency(performance.lastMonthSpent)}
                      </Text>
                      <View style={styles.performanceBarContainer}>
                        <View
                          style={[
                            styles.performanceBar,
                            {
                              width: `${Math.min(performance.lastMonthPercentage, 100)}%`,
                              backgroundColor: getStatusColor(performance.lastMonthStatus),
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.performanceStats}>
                        <Text
                          style={[
                            styles.performancePercent,
                            { color: getStatusColor(performance.lastMonthStatus) },
                          ]}
                        >
                          {performance.lastMonthPercentage}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      {budgets.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="plus" size={28} color={brandColors.white} />
        </TouchableOpacity>
      )}

      {/* ADD BUDGET MODAL */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Budget</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name={actionIcons.close} size={24} color={brandColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Category</Text>
              {availableCategories.length === 0 ? (
                <View style={styles.noCategoriesContainer}>
                  <Text style={styles.noCategoriesText}>
                    All categories already have budgets assigned
                  </Text>
                </View>
              ) : (
                <View style={styles.categoryGrid}>
                  {availableCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        selectedCategory === cat && styles.categoryButtonSelected,
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Icon
                        name={getCategoryIcon(cat)}
                        size={18}
                        color={selectedCategory === cat ? brandColors.white : brandColors.primary}
                        style={styles.categoryButtonIcon}
                      />
                      <Text
                        style={[
                          styles.categoryButtonText,
                          selectedCategory === cat && styles.categoryButtonTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.label}>Monthly Limit (USD)</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  value={limitAmount}
                  onChangeText={setLimitAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={brandColors.textGray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || availableCategories.length === 0) && styles.saveButtonDisabled
                ]}
                onPress={handleAddBudget}
                disabled={saving || availableCategories.length === 0}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Budget'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT BUDGET MODAL */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Budget</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name={actionIcons.close} size={24} color={brandColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryDisplayContainer}>
                <View style={[styles.categoryIconContainer, { backgroundColor: brandColors.primaryLight }]}>
                  <Icon
                    name={getCategoryIcon(editingBudget?.category || '')}
                    size={24}
                    color={brandColors.primary}
                  />
                </View>
                <Text style={styles.categoryDisplayText}>{editingBudget?.category}</Text>
              </View>

              <Text style={styles.label}>Monthly Limit (USD)</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  value={limitAmount}
                  onChangeText={setLimitAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={brandColors.textGray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleEditBudget}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Updating...' : 'Update Budget'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PREMIUM UPGRADE MODAL */}
      <PremiumUpgradeModal
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature="Smart Budgets"
        onUpgrade={(plan) => {
          console.log(`User selected ${plan} plan`);
          // TODO: Implement payment flow here
          // For now, just close the modal
          setShowPremiumModal(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
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
    backgroundColor: brandColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: brandColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textSecondary,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textPrimary,
    letterSpacing: -0.3,
  },
  budgetCount: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: brandColors.border,
    marginHorizontal: 16,
  },
  summaryProgressContainer: {
    marginBottom: 16,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  summaryRemainingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },
  summaryRemainingValue: {
    fontSize: 18,
    fontWeight: '600',
  },

  // Budget Card
  budgetCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  budgetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 4,
  },
  budgetRemaining: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  amountRow: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  budgetSpent: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  budgetLimit: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.white,
  },

  // Budget Breakdown
  budgetBreakdown: {
    backgroundColor: brandColors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  breakdownHint: {
    fontSize: 11,
    fontWeight: '500',
    color: brandColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: brandColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brandColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: brandColors.background,
    borderWidth: 2,
    borderColor: brandColors.border,
  },
  categoryButtonSelected: {
    backgroundColor: brandColors.primary,
    borderColor: brandColors.primary,
  },
  categoryButtonIcon: {
    marginRight: 2,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textPrimary,
  },
  categoryButtonTextSelected: {
    color: brandColors.white,
  },
  categoryDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: brandColors.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brandColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: brandColors.white,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  noCategoriesContainer: {
    padding: 20,
    backgroundColor: brandColors.background,
    borderRadius: 12,
    marginBottom: 16,
  },
  noCategoriesText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brandColors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: brandColors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },

  // Performance Section
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textSecondary,
    marginTop: 2,
  },
  performanceCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  performanceHeader: {
    marginBottom: 16,
  },
  performanceCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  performanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brandColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  performanceCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 2,
  },
  performanceBudget: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },
  performanceComparison: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceMonth: {
    flex: 1,
  },
  performanceMonthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textSecondary,
    marginBottom: 4,
  },
  performanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 8,
  },
  performanceBarContainer: {
    height: 6,
    backgroundColor: brandColors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  performanceBar: {
    height: '100%',
    borderRadius: 3,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  performancePercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  performanceStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textSecondary,
  },
});
