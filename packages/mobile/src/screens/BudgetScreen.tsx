import React, { useState, useEffect } from 'react';
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
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';

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

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/transactions`)
      .where('type', '==', 'expense')
      .where('date', '>=', firestore.Timestamp.fromDate(startOfMonth))
      .where('date', '<=', firestore.Timestamp.fromDate(endOfMonth))
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) {
            return;
          }

          const transactions = snapshot.docs.map((doc) => doc.data()) as Transaction[];

          const categorySpending: { [key: string]: number } = {};
          transactions.forEach((txn) => {
            const category = txn.category || 'Uncategorized';
            categorySpending[category] = (categorySpending[category] || 0) + txn.amount;
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

    // Check if budget already exists for this category
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

  const handleDeleteBudget = async (budgetId: string) => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
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
    if (percentage >= 100) return brandColors.red;
    if (percentage >= 80) return brandColors.amber;
    return brandColors.green;
  };

  const renderBudget = (budget: Budget) => {
    const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
    const remaining = Math.max(budget.limit - budget.spent, 0);

    return (
      <TouchableOpacity
        key={budget.id}
        style={styles.budgetCard}
        onLongPress={() => handleDeleteBudget(budget.id)}
      >
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetCategory}>{budget.category}</Text>
          <Text style={styles.budgetRemaining}>
            ${remaining.toFixed(2)} left
          </Text>
        </View>

        <View style={styles.budgetAmounts}>
          <Text style={styles.budgetSpent}>${budget.spent.toFixed(2)}</Text>
          <Text style={styles.budgetLimit}>of ${budget.limit.toFixed(2)}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor: getProgressColor(budget.spent, budget.limit),
              },
            ]}
          />
        </View>

        <Text style={styles.budgetPercentage}>{percentage.toFixed(0)}% used</Text>
      </TouchableOpacity>
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No budgets yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + Add button to create your first budget
            </Text>
          </View>
        ) : (
          budgets.map(renderBudget)
        )}
      </ScrollView>

      {/* Add Budget Modal */}
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
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>Category</Text>
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

              <Text style={styles.label}>Monthly Limit (USD)</Text>
              <TextInput
                style={styles.input}
                value={limitAmount}
                onChangeText={setLimitAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={brandColors.textGray}
              />
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
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddBudget}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: brandColors.white,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  addButton: {
    backgroundColor: brandColors.tealPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  budgetCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  budgetRemaining: {
    fontSize: 14,
    color: brandColors.green,
    fontWeight: '500',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  budgetSpent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginRight: 4,
  },
  budgetLimit: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    color: brandColors.textGray,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  closeButton: {
    fontSize: 24,
    color: brandColors.textGray,
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: brandColors.white,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  categoryButtonSelected: {
    backgroundColor: brandColors.tealPrimary,
    borderColor: brandColors.tealPrimary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
  },
  categoryButtonTextSelected: {
    color: brandColors.white,
  },
  input: {
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: brandColors.textDark,
    backgroundColor: brandColors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
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
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
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
