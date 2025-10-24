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
        <ActivityIndicator size="large" color={brandColors.tealPrimary} />
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
              <Icon name="menu" size={24} color={brandColors.textDark} />
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
                <Icon name="flag-variant-outline" size={48} color={brandColors.textGray} />
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
                          <Icon name="flag-variant" size={20} color={brandColors.orangeAccent} />
                        </View>
                        <Text style={styles.goalName}>{goal.name}</Text>
                        <Icon
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={brandColors.textGray}
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
                      <Icon name="plus-circle" size={18} color={brandColors.white} />
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
                        size={18}
                        color={(goal.allocatedAmount || 0) > 0 ? brandColors.tealPrimary : brandColors.lightGray}
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
                      <Icon name="pencil" size={18} color={brandColors.textGray} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.goalActionIconButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteGoal(goal);
                      }}
                    >
                      <Icon name="delete" size={18} color={brandColors.error} />
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
    backgroundColor: brandColors.backgroundOffWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.backgroundOffWhite,
  },

  // Header
  header: {
    backgroundColor: brandColors.white,
    paddingTop: 60,
    paddingBottom: 20,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brandColors.orangeAccent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: brandColors.white,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textGray,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  summaryAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: brandColors.tealPrimary,
    letterSpacing: -1.5,
    marginBottom: 6,
  },
  summaryTarget: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 20,
  },
  progressBarOuter: {
    height: 10,
    backgroundColor: brandColors.lightGray,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: brandColors.tealPrimary,
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brandColors.lightGray + '50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },

  // Goal Card
  goalCard: {
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    marginBottom: 16,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: brandColors.orangeAccent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  goalSaved: {
    fontSize: 28,
    fontWeight: '800',
    color: brandColors.textDark,
  },
  goalOf: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  goalTarget: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: brandColors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.textGray,
  },

  // Goal Actions
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  goalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  goalActionPrimary: {
    backgroundColor: brandColors.tealPrimary,
    flex: 1,
    justifyContent: 'center',
  },
  goalActionSecondary: {
    backgroundColor: brandColors.white,
    borderWidth: 1.5,
    borderColor: brandColors.tealPrimary,
    flex: 1,
    justifyContent: 'center',
  },
  goalActionTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.white,
  },
  goalActionTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },
  goalActionTextDisabled: {
    color: brandColors.lightGray,
  },
  goalActionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: brandColors.backgroundOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // History
  historySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: brandColors.textGray,
    letterSpacing: 1,
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border + '50',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  historyMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyBalanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textGray,
    marginBottom: 2,
  },
  historyBalance: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.tealPrimary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.orangeAccent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
