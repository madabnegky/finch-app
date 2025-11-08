// packages/mobile/src/components/HealthScoreCard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import brandColors from '../theme/colors';

type HealthScoreData = {
  score: number;
  lastCalculated: any;
  breakdown: {
    availableCushion: { score: number; maxScore: number; amount: number };
    daysUntilBroke: { score: number; maxScore: number; days: number };
    budgetAdherence: { score: number; maxScore: number; categoriesOver: number; hasBudgets: boolean };
    emergencyFund: { score: number; maxScore: number; monthsCovered: number };
    billsCovered: { score: number; maxScore: number; billsAtRisk: number; totalUpcomingBills: number };
  };
  trend: 'improving' | 'stable' | 'declining';
  previousScore?: number;
};

type HealthScoreCardProps = {
  userId: string;
};

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ userId }) => {
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('healthScore')
      .doc('current')
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setHealthScore(doc.data() as HealthScoreData);
          } else {
            // No score yet, trigger calculation
            calculateScore();
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching health score:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [userId]);

  const calculateScore = async () => {
    try {
      setCalculating(true);
      const calculateHealthScore = functions().httpsCallable('calculateHealthScore');
      await calculateHealthScore();
    } catch (error) {
      console.error('Error calculating health score:', error);
    } finally {
      setCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return brandColors.success;
    if (score >= 60) return brandColors.primary;
    if (score >= 40) return brandColors.warning;
    return brandColors.error;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'improving') return 'trending-up';
    if (trend === 'declining') return 'trending-down';
    return 'trending-neutral';
  };

  const getTrendColor = (trend?: string) => {
    if (trend === 'improving') return brandColors.success;
    if (trend === 'declining') return brandColors.error;
    return brandColors.textSecondary;
  };

  if (loading || calculating) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={brandColors.primary} />
        <Text style={styles.loadingText}>
          {calculating ? 'Calculating your health score...' : 'Loading health score...'}
        </Text>
      </View>
    );
  }

  if (!healthScore) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Financial Health Score</Text>
        <TouchableOpacity style={styles.calculateButton} onPress={calculateScore}>
          <Text style={styles.calculateButtonText}>Calculate Score</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scoreColor = getScoreColor(healthScore.score);
  const scoreLabel = getScoreLabel(healthScore.score);

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => setShowBreakdown(true)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Financial Health</Text>
          {healthScore.trend && (
            <Icon
              name={getTrendIcon(healthScore.trend)}
              size={20}
              color={getTrendColor(healthScore.trend)}
            />
          )}
        </View>

        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {healthScore.score}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>

          <View style={styles.scoreLabelContainer}>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
            <Text style={styles.tapToView}>Tap to view breakdown</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Breakdown Modal */}
      <Modal
        visible={showBreakdown}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBreakdown(false)}>
              <Icon name="close" size={28} color={brandColors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Health Score Breakdown</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Overall Score */}
            <View style={styles.overallScore}>
              <View style={[styles.largeScoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.largeScoreNumber, { color: scoreColor }]}>
                  {healthScore.score}
                </Text>
                <Text style={styles.largeScoreMax}>/100</Text>
              </View>
              <Text style={[styles.largeScoreLabel, { color: scoreColor }]}>
                {scoreLabel}
              </Text>
              {healthScore.trend && healthScore.previousScore && (
                <Text style={styles.trendText}>
                  {healthScore.trend === 'improving' && '↑ '}
                  {healthScore.trend === 'declining' && '↓ '}
                  {Math.abs(healthScore.score - healthScore.previousScore)} points from last time
                </Text>
              )}
            </View>

            {/* Breakdown Items */}
            <Text style={styles.sectionTitle}>Score Components</Text>

            <BreakdownItem
              title="Available Balance Cushion"
              score={healthScore.breakdown.availableCushion.score}
              maxScore={healthScore.breakdown.availableCushion.maxScore}
              detail={`You have $${healthScore.breakdown.availableCushion.amount.toFixed(2)} available to spend`}
              icon="wallet"
            />

            <BreakdownItem
              title="Days Until Broke"
              score={healthScore.breakdown.daysUntilBroke.score}
              maxScore={healthScore.breakdown.daysUntilBroke.maxScore}
              detail={
                healthScore.breakdown.daysUntilBroke.days >= 60
                  ? 'You have over 60 days of runway'
                  : `You have ${healthScore.breakdown.daysUntilBroke.days} days before running out of money`
              }
              icon="calendar-clock"
            />

            <BreakdownItem
              title="Budget Adherence"
              score={healthScore.breakdown.budgetAdherence.score}
              maxScore={healthScore.breakdown.budgetAdherence.maxScore}
              detail={
                !healthScore.breakdown.budgetAdherence.hasBudgets
                  ? 'Set budgets to improve this score'
                  : healthScore.breakdown.budgetAdherence.categoriesOver === 0
                  ? 'All budgets on track!'
                  : `${healthScore.breakdown.budgetAdherence.categoriesOver} budgets over limit`
              }
              icon="chart-box"
            />

            <BreakdownItem
              title="Emergency Fund"
              score={healthScore.breakdown.emergencyFund.score}
              maxScore={healthScore.breakdown.emergencyFund.maxScore}
              detail={
                healthScore.breakdown.emergencyFund.monthsCovered === 0
                  ? 'No emergency fund detected'
                  : `${healthScore.breakdown.emergencyFund.monthsCovered.toFixed(1)} months of expenses covered`
              }
              icon="shield-check"
            />

            <BreakdownItem
              title="Bills Covered"
              score={healthScore.breakdown.billsCovered.score}
              maxScore={healthScore.breakdown.billsCovered.maxScore}
              detail={
                healthScore.breakdown.billsCovered.billsAtRisk === 0
                  ? 'All upcoming bills covered'
                  : `${healthScore.breakdown.billsCovered.billsAtRisk} bills at risk`
              }
              icon="file-document-check"
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

type BreakdownItemProps = {
  title: string;
  score: number;
  maxScore: number;
  detail: string;
  icon: string;
};

const BreakdownItem: React.FC<BreakdownItemProps> = ({
  title,
  score,
  maxScore,
  detail,
  icon,
}) => {
  const percentage = (score / maxScore) * 100;
  const color = percentage >= 80 ? brandColors.success : percentage >= 50 ? brandColors.warning : brandColors.error;

  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownHeader}>
        <View style={styles.breakdownTitleRow}>
          <Icon name={icon} size={24} color={brandColors.primary} />
          <Text style={styles.breakdownTitle}>{title}</Text>
        </View>
        <Text style={[styles.breakdownScore, { color }]}>
          {score}/{maxScore}
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.breakdownDetail}>{detail}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: brandColors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.text,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 14,
    color: brandColors.textSecondary,
  },
  scoreLabelContainer: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  tapToView: {
    fontSize: 14,
    color: brandColors.textSecondary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: brandColors.textSecondary,
    textAlign: 'center',
  },
  calculateButton: {
    backgroundColor: brandColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: brandColors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  overallScore: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: brandColors.surface,
    borderRadius: 16,
    marginBottom: 24,
  },
  largeScoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  largeScoreNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  largeScoreMax: {
    fontSize: 18,
    color: brandColors.textSecondary,
  },
  largeScoreLabel: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  trendText: {
    fontSize: 14,
    color: brandColors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brandColors.text,
    marginBottom: 16,
  },
  breakdownItem: {
    backgroundColor: brandColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.text,
    marginLeft: 8,
  },
  breakdownScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: brandColors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownDetail: {
    fontSize: 14,
    color: brandColors.textSecondary,
  },
});
