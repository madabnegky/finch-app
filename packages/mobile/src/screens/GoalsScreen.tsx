// packages/mobile/src/screens/GoalsScreen.tsx
// Redesigned in Executive+ Style
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
import FinchLogo from '../components/FinchLogo';
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
        const goalsSnapshot = await firestore()
          .collection(`users/${user.uid}/goals`)
          .get();

        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();
          const totalAllocatedToGoals = goalsSnapshot.docs
            .filter(goalDoc => goalDoc.data().accountId === doc.id)
            .reduce((sum, goalDoc) => sum + (goalDoc.data().allocatedAmount || 0), 0);
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

      const goalRef = firestore().collection(`users/${user.uid}/goals`).doc(goal.id);
      batch.update(goalRef, {
        allocatedAmount: newAllocatedAmount,
        accountId: accountId,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

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

      const goalRef = firestore().collection(`users/${user.uid}/goals`).doc(goal.id);
      batch.update(goalRef, {
        allocatedAmount: newAllocatedAmount,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

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
    if (daysUntil < 0) return brandColors.error;
    if (daysUntil <= 30) return brandColors.orangeAccent;
    return brandColors.tealPrimary;
  };

  const totalAllocated = goals.reduce((sum, goal) => sum + (goal.allocatedAmount || 0), 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalAllocated / totalTarget) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CUSTOM HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
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
              <Text style={styles.headerTitle}>Goals</Text>
              <Text style={styles.headerSubtitle}>Save for Your Future</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* SUMMARY CARD */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL PROGRESS</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(totalAllocated)}
            </Text>
            <Text style={styles.summaryTarget}>of {formatCurrency(totalTarget)} target</Text>

            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarFill, { width: `${Math.min(overallProgress, 100)}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{overallProgress.toFixed(0)}% Complete</Text>
          </View>
        </View>

        {/* GOALS LIST */}
        <View style={styles.section}>
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="flag-variant-outline" size={48} color={brandColors.textTertiary} />
              </View>
              <Text style={styles.emptyStateTitle}>No Goals Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first goal to start saving towards something special!
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const progress = goal.targetAmount > 0 ? (goal.allocatedAmount / goal.targetAmount) * 100 : 0;
              const isExpanded = expandedGoalId === goal.id;
              const daysUntil = getDaysUntilDeadline(goal.deadline);
              const deadlineColor = getDeadlineColor(daysUntil);
              const history = allocationHistory[goal.id] || [];

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <TouchableOpacity onPress={() => toggleGoalExpansion(goal.id)} activeOpacity={0.7}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <View style={styles.goalIconContainer}>
                          <Icon name="flag-variant" size={20} color={brandColors.primary} />
                        </View>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={brandColors.textSecondary}
                        />
                      </View>

                      {goal.deadline && (
                        <View style={[styles.deadlineBadge, { backgroundColor: deadlineColor + '10' }]}>
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

                      <View style={styles.goalAmounts}>
                        <Text style={styles.goalSaved}>{formatCurrency(goal.allocatedAmount || 0)}</Text>
                        <Text style={styles.goalOf}> of </Text>
                        <Text style={styles.goalTarget}>{formatCurrency(goal.targetAmount)}</Text>
                      </View>

                      <View style={styles.goalProgressBar}>
                        <View style={[styles.goalProgressFill, {
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: progress >= 100 ? brandColors.success : brandColors.tealPrimary
                        }]} />
                      </View>
                      <Text style={styles.goalProgressText}>{progress.toFixed(0)}% Complete</Text>
                    </View>
                  </TouchableOpacity>

                  {/* ACTION BUTTONS */}
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={[styles.goalActionButton, styles.goalActionPrimary]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleAllocate(goal);
                      }}
                    >
                      <Icon name="plus-circle" size={16} color={brandColors.primary} />
                      <Text style={styles.goalActionTextPrimary}>Add Funds</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalActionButton, styles.goalActionSecondary]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeallocate(goal);
                      }}
                      disabled={(goal.allocatedAmount || 0) === 0}
                    >
                      <Icon
                        name="minus-circle"
                        size={16}
                        color={(goal.allocatedAmount || 0) > 0 ? brandColors.primary : brandColors.textTertiary}
                      />
                      <Text style={[
                        styles.goalActionTextSecondary,
                        (goal.allocatedAmount || 0) === 0 && styles.goalActionTextDisabled
                      ]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.goalActionIconButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditGoal(goal);
                      }}
                    >
                      <Icon name="pencil" size={16} color={brandColors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.goalActionIconButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteGoal(goal);
                      }}
                    >
                      <Icon name="delete" size={16} color={brandColors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* EXPANDED: ALLOCATION HISTORY */}
                  {isExpanded && (
                    <View style={styles.historySection}>
                      <Text style={styles.historyTitle}>ALLOCATION HISTORY</Text>
                      {history.length === 0 ? (
                        <Text style={styles.historyEmpty}>No allocations yet</Text>
                      ) : (
                        history.map((item) => (
                          <View key={item.id} style={styles.historyItem}>
                            <View style={[
                              styles.historyIcon,
                              { backgroundColor: item.type === 'allocate' ? brandColors.success + '15' : brandColors.error + '15' }
                            ]}>
                              <Icon
                                name={item.type === 'allocate' ? 'plus' : 'minus'}
                                size={16}
                                color={item.type === 'allocate' ? brandColors.success : brandColors.error}
                              />
                            </View>
                            <View style={styles.historyDetails}>
                              <Text style={styles.historyAmount}>
                                {item.type === 'allocate' ? '+' : '-'}
                                {formatCurrency(Math.abs(item.amount))}
                              </Text>
                              <Text style={styles.historyMeta}>
                                {item.accountName} • {formatDate(item.timestamp)}
                              </Text>
                            </View>
                            <View style={styles.historyRight}>
                              <Text style={styles.historyBalanceLabel}>Balance</Text>
                              <Text style={styles.historyBalance}>{formatCurrency(item.balanceAfter)}</Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddGoal(true)}>
        <Icon name="plus" size={28} color={brandColors.white} />
      </TouchableOpacity>

      {/* MODALS */}
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
    backgroundColor: brandColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background,
  },

  // Header - Updated to professional minimal
  header: {
    backgroundColor: brandColors.white,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
    marginRight: 4,
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
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: brandColors.textSecondary,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  // Summary Card - Subtle design
  summaryCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: brandColors.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryTarget: {
    fontSize: 14,
    fontWeight: '400',
    color: brandColors.textSecondary,
    marginBottom: 16,
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: brandColors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: brandColors.primary,
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: brandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },

  // Goal Card - Compact professional design
  goalCard: {
    backgroundColor: brandColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: brandColors.border,
  },
  goalHeader: {
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: brandColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  goalSaved: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  goalOf: {
    fontSize: 13,
    fontWeight: '400',
    color: brandColors.textSecondary,
  },
  goalTarget: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: brandColors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalProgressText: {
    fontSize: 11,
    fontWeight: '500',
    color: brandColors.textSecondary,
  },

  // Goal Actions - Text link style (preserving TouchableOpacity)
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  goalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  goalActionPrimary: {
    flex: 1,
  },
  goalActionSecondary: {
    flex: 1,
  },
  goalActionTextPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.primary,
  },
  goalActionTextSecondary: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.primary,
  },
  goalActionTextDisabled: {
    color: brandColors.textTertiary,
  },
  goalActionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // History
  historySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  historyEmpty: {
    fontSize: 13,
    fontWeight: '400',
    color: brandColors.textSecondary,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.borderLight,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textPrimary,
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: brandColors.textSecondary,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyBalanceLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: brandColors.textTertiary,
    marginBottom: 2,
  },
  historyBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.primary,
  },

  // FAB - Updated to primary blue
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
});
