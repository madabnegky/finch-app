// packages/mobile/src/screens/GoalsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';
import { AddGoalModal } from '../components/AddGoalModal';
import { EditGoalModal } from '../components/EditGoalModal';
import { AllocateFundsModal } from '../components/AllocateFundsModal';
import { DeallocateFundsModal } from '../components/DeallocateFundsModal';
import brandColors from '../theme/colors';

type Account = {
  id: string;
  name: string;
  currentBalance: number;
  cushion: number;
  availableToSpend: number;
};

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  accountId?: string;
  deadline?: any;
  createdAt: any;
  updatedAt?: any;
};

type AllocationHistory = {
  id: string;
  goalId: string;
  accountId: string;
  accountName: string;
  amount: number;
  type: 'allocate' | 'deallocate';
  timestamp: any;
  balanceAfter: number;
};

export const GoalsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showDeallocate, setShowDeallocate] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [allocationHistory, setAllocationHistory] = useState<{ [goalId: string]: AllocationHistory[] }>({});

  // Fetch goals from Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribeGoals = firestore()
      .collection(`users/${user.uid}/goals`)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Goal));
        setGoals(goalsData);
        setLoading(false);
      });

    const unsubscribeAccounts = firestore()
      .collection(`users/${user.uid}/accounts`)
      .onSnapshot(async (snapshot) => {
        // Fetch all goals to calculate total allocations per account
        const goalsSnapshot = await firestore()
          .collection(`users/${user.uid}/goals`)
          .get();

        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();

          // Calculate total allocated to goals for this account
          const totalAllocatedToGoals = goalsSnapshot.docs
            .filter(goalDoc => goalDoc.data().accountId === doc.id)
            .reduce((sum, goalDoc) => sum + (goalDoc.data().allocatedAmount || 0), 0);

          // availableToSpend = currentBalance - cushion - goalAllocations
          const availableToSpend = (data.currentBalance || 0) - (data.cushion || 0) - totalAllocatedToGoals;

          return {
            id: doc.id,
            name: data.name || 'Unnamed Account',
            currentBalance: data.currentBalance || 0,
            cushion: data.cushion || 0,
            availableToSpend,
          };
        });
        setAccounts(accountsData);
      });

    return () => {
      unsubscribeGoals();
      unsubscribeAccounts();
    };
  }, [user]);

  // Fetch allocation history for expanded goal
  useEffect(() => {
    if (!user || !expandedGoalId) return;

    const unsubscribe = firestore()
      .collection(`users/${user.uid}/allocationHistory`)
      .where('goalId', '==', expandedGoalId)
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as AllocationHistory));
        setAllocationHistory(prev => ({
          ...prev,
          [expandedGoalId]: history,
        }));
      });

    return () => unsubscribe();
  }, [user, expandedGoalId]);

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Delete Goal?',
      `Are you sure you want to delete "${goal.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection(`users/${user?.uid}/goals`)
                .doc(goal.id)
                .delete();
              Alert.alert('Success', 'Goal deleted successfully');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowEditGoal(true);
  };

  const handleAllocate = (goal: Goal) => {
    setSelectedGoal({
      ...goal,
      goalName: goal.name,
      availableToSpend: accounts.length > 0 ? accounts[0].availableToSpend : 0,
    } as any);
    setShowAllocate(true);
  };

  const handleDeallocate = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowDeallocate(true);
  };

  const handleAllocateFunds = async (goal: Goal, amountToAllocate: number, accountId: string) => {
    if (!user || !goal || amountToAllocate <= 0 || !accountId) return;

    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        Alert.alert('Error', 'Account not found');
        return;
      }

      const newAllocatedAmount = (goal.allocatedAmount || 0) + amountToAllocate;

      const batch = firestore().batch();

      // Update goal only - do NOT touch account balance
      const goalRef = firestore().collection(`users/${user.uid}/goals`).doc(goal.id);
      batch.update(goalRef, {
        allocatedAmount: newAllocatedAmount,
        accountId: accountId, // Track which account this goal is linked to
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add allocation history
      const historyRef = firestore().collection(`users/${user.uid}/allocationHistory`).doc();
      batch.set(historyRef, {
        goalId: goal.id,
        goalName: goal.name,
        accountId: account.id,
        accountName: account.name,
        amount: amountToAllocate,
        type: 'allocate',
        timestamp: firestore.FieldValue.serverTimestamp(),
        balanceAfter: newAllocatedAmount,
      });

      await batch.commit();

      setShowAllocate(false);
      setSelectedGoal(null);
      Alert.alert('Success', `Allocated ${formatCurrency(amountToAllocate)} to ${goal.name}`);
    } catch (error) {
      console.error('Error allocating funds:', error);
      Alert.alert('Error', 'Failed to allocate funds. Please try again.');
    }
  };

  const handleDeallocateFunds = async (goal: Goal, amountToDeallocate: number, accountId: string) => {
    if (!user || !goal || amountToDeallocate <= 0 || !accountId) return;

    try {
      const account = accounts.find(acc => acc.id === accountId);
      if (!account) {
        Alert.alert('Error', 'Account not found');
        return;
      }

      const newAllocatedAmount = (goal.allocatedAmount || 0) - amountToDeallocate;

      const batch = firestore().batch();

      // Update goal only - do NOT touch account balance
      const goalRef = firestore().collection(`users/${user.uid}/goals`).doc(goal.id);
      batch.update(goalRef, {
        allocatedAmount: newAllocatedAmount,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add allocation history
      const historyRef = firestore().collection(`users/${user.uid}/allocationHistory`).doc();
      batch.set(historyRef, {
        goalId: goal.id,
        goalName: goal.name,
        accountId: account.id,
        accountName: account.name,
        amount: -amountToDeallocate,
        type: 'deallocate',
        timestamp: firestore.FieldValue.serverTimestamp(),
        balanceAfter: newAllocatedAmount,
      });

      await batch.commit();

      setShowDeallocate(false);
      setSelectedGoal(null);
      Alert.alert('Success', `Removed ${formatCurrency(amountToDeallocate)} from ${goal.name}`);
    } catch (error) {
      console.error('Error deallocating funds:', error);
      Alert.alert('Error', 'Failed to deallocate funds. Please try again.');
    }
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoalId(expandedGoalId === goalId ? null : goalId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntilDeadline = (deadline: any) => {
    if (!deadline) return null;
    const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysUntil: number | null) => {
    if (daysUntil === null) return brandColors.textGray;
    if (daysUntil < 0) return brandColors.red;
    if (daysUntil <= 30) return brandColors.orangeAccent;
    return brandColors.tealPrimary;
  };

  const totalAllocated = goals.reduce((sum, goal) => sum + (goal.allocatedAmount || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalAllocated / totalTarget) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Goals Progress</Text>
        <Text style={styles.summaryAmount}>
          {formatCurrency(totalAllocated)} <Text style={styles.summaryTarget}>of {formatCurrency(totalTarget)}</Text>
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${Math.min(overallProgress, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>{overallProgress.toFixed(1)}% Complete</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="flag-variant-outline" size={64} color={brandColors.lightGray} />
            <Text style={styles.emptyStateTitle}>No Goals Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first goal to start saving towards something special!
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = (goal.allocatedAmount / goal.targetAmount) * 100;
            const isExpanded = expandedGoalId === goal.id;
            const daysUntil = getDaysUntilDeadline(goal.deadline);
            const deadlineColor = getDeadlineColor(daysUntil);
            const history = allocationHistory[goal.id] || [];

            return (
              <View key={goal.id} style={styles.goalCard}>
                <TouchableOpacity onPress={() => toggleGoalExpansion(goal.id)} activeOpacity={0.7}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      {goal.deadline && (
                        <View style={[styles.deadlineBadge, { backgroundColor: deadlineColor + '20' }]}>
                          <Icon name="calendar-clock" size={14} color={deadlineColor} />
                          <Text style={[styles.deadlineText, { color: deadlineColor }]}>
                            {daysUntil !== null && daysUntil < 0
                              ? `${Math.abs(daysUntil)}d overdue`
                              : daysUntil !== null && daysUntil === 0
                              ? 'Today!'
                              : daysUntil !== null && daysUntil <= 30
                              ? `${daysUntil}d left`
                              : formatDate(goal.deadline)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.goalAmountRow}>
                      <Text style={styles.goalAmount}>{formatCurrency(goal.allocatedAmount || 0)}</Text>
                      <Text style={styles.goalTarget}> of {formatCurrency(goal.targetAmount)}</Text>
                    </View>
                    <View style={styles.goalProgressContainer}>
                      <View style={[styles.goalProgressBar, { width: `${Math.min(progress, 100)}%` }]} />
                    </View>
                    <Text style={styles.goalProgressText}>{progress.toFixed(1)}% Complete</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAllocate(goal);
                      }}
                    >
                      <Icon name="plus-circle" size={20} color={brandColors.tealPrimary} />
                      <Text style={styles.actionButtonText}>Add Funds</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeallocate(goal);
                      }}
                      disabled={(goal.allocatedAmount || 0) === 0}
                    >
                      <Icon
                        name="minus-circle"
                        size={20}
                        color={(goal.allocatedAmount || 0) > 0 ? brandColors.orangeAccent : brandColors.lightGray}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          (goal.allocatedAmount || 0) === 0 && styles.actionButtonTextDisabled,
                        ]}
                      >
                        Remove Funds
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditGoal(goal);
                      }}
                    >
                      <Icon name="pencil" size={20} color={brandColors.textGray} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteGoal(goal);
                      }}
                    >
                      <Icon name="delete" size={20} color={brandColors.red} />
                      <Text style={[styles.actionButtonText, { color: brandColors.red }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Expanded: Allocation History */}
                {isExpanded && (
                  <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>Allocation History</Text>
                    {history.length === 0 ? (
                      <Text style={styles.historyEmpty}>No allocations yet</Text>
                    ) : (
                      history.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                          <Icon
                            name={item.type === 'allocate' ? 'plus-circle' : 'minus-circle'}
                            size={20}
                            color={item.type === 'allocate' ? brandColors.tealPrimary : brandColors.orangeAccent}
                          />
                          <View style={styles.historyDetails}>
                            <Text style={styles.historyAmount}>
                              {item.type === 'allocate' ? '+' : '-'}
                              {formatCurrency(Math.abs(item.amount))}
                            </Text>
                            <Text style={styles.historyMeta}>
                              {item.accountName} • {formatDate(item.timestamp)}
                            </Text>
                          </View>
                          <Text style={styles.historyBalance}>{formatCurrency(item.balanceAfter)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddGoal(true)}>
        <Icon name="plus" size={28} color={brandColors.white} />
      </TouchableOpacity>

      {/* Modals */}
      <AddGoalModal
        visible={showAddGoal}
        onClose={() => setShowAddGoal(false)}
        onSuccess={() => setShowAddGoal(false)}
      />

      {selectedGoal && (
        <>
          <EditGoalModal
            visible={showEditGoal}
            goal={selectedGoal}
            onClose={() => {
              setShowEditGoal(false);
              setSelectedGoal(null);
            }}
            onSuccess={() => {
              setShowEditGoal(false);
              setSelectedGoal(null);
            }}
          />

          <AllocateFundsModal
            visible={showAllocate}
            goal={selectedGoal as any}
            accounts={accounts}
            onClose={() => {
              setShowAllocate(false);
              setSelectedGoal(null);
            }}
            onSave={handleAllocateFunds}
          />

          <DeallocateFundsModal
            visible={showDeallocate}
            goal={selectedGoal}
            accounts={accounts}
            onClose={() => {
              setShowDeallocate(false);
              setSelectedGoal(null);
            }}
            onSave={handleDeallocateFunds}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },
  summaryCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: brandColors.tealDark,
    marginBottom: 12,
  },
  summaryTarget: {
    fontSize: 18,
    color: brandColors.textGray,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: brandColors.textGray,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: brandColors.textGray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  goalCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: brandColors.textDark,
    flex: 1,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  goalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.tealDark,
  },
  goalTarget: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  goalProgressContainer: {
    height: 6,
    backgroundColor: brandColors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  goalProgressBar: {
    height: '100%',
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 3,
  },
  goalProgressText: {
    fontSize: 12,
    color: brandColors.textGray,
  },
  goalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  actionButtonTextDisabled: {
    color: brandColors.lightGray,
  },
  historySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
    color: brandColors.textGray,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray + '50',
  },
  historyDetails: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  historyMeta: {
    fontSize: 12,
    color: brandColors.textGray,
    marginTop: 2,
  },
  historyBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.tealDark,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.tealPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
