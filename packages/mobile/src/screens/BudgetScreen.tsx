import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import FinchLogo from '../components/FinchLogo';
import brandColors from '../theme/colors';
import { categoryIcons, actionIcons } from '../theme/icons';

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

type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
};

type Transaction = {
  amount: number;
  type: string;
  category?: string;
  date: any;
};

export const BudgetScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);

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

          const budgetData = snapshot.docs.map((doc) => ({
            id: doc.id,
            category: doc.data().category,
            limit: doc.data().limit,
            spent: 0,
          }));

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

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('type', '==', 'expense')
      .where('date', '>=', firestore.Timestamp.fromDate(startOfMonth))
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            return;
          }

          const transactions = snapshot.docs
            .map((doc) => doc.data() as Transaction)
            .filter((txn) => {
              const txnDate = txn.date?.toDate ? txn.date.toDate() : new Date(txn.date);
              return txnDate <= endOfMonth;
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
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
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteBudget(budget.id, budget.category)}
          >
            <Icon name={actionIcons.delete} size={20} color={brandColors.textGray} />
          </TouchableOpacity>
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

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>

        <Text style={[styles.budgetPercentage, { color: progressColor }]}>
          {percentage.toFixed(0)}% used
        </Text>
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
            <Icon name="menu" size={24} color={brandColors.textDark} />
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
                <Icon name="chart-pie" size={24} color={brandColors.tealPrimary} />
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
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(budgetSummary.overallPercentage, 100)}%`,
                        backgroundColor: getProgressColor(budgetSummary.totalSpent, budgetSummary.totalBudgeted),
                      },
                    ]}
                  />
                </View>
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
                <Icon name={actionIcons.close} size={24} color={brandColors.textGray} />
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
                        color={selectedCategory === cat ? brandColors.white : brandColors.tealPrimary}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    letterSpacing: -0.3,
  },
  budgetCount: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
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
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
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
    color: brandColors.textGray,
  },
  summaryRemainingValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Budget Card
  budgetCard: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 4,
  },
  budgetRemaining: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
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
    color: brandColors.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  budgetSpent: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  budgetLimit: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textGray,
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
  budgetPercentage: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Empty State
  emptyState: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: brandColors.backgroundOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: brandColors.orangeAccent,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brandColors.orangeAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontWeight: '700',
    color: brandColors.textDark,
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.textDark,
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
    backgroundColor: brandColors.backgroundOffWhite,
    borderWidth: 2,
    borderColor: brandColors.border,
  },
  categoryButtonSelected: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  categoryButtonIcon: {
    marginRight: 2,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  categoryButtonTextSelected: {
    color: brandColors.white,
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
    color: brandColors.textGray,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  noCategoriesContainer: {
    padding: 20,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    marginBottom: 16,
  },
  noCategoriesText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
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
    color: brandColors.textDark,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: brandColors.orangeAccent,
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
});
