import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
};

type WhatIfModalProps = {
  visible: boolean;
  onClose: () => void;
  currentBalance: number; // Starting balance for simulation
};

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  visible,
  onClose,
  currentBalance,
}) => {
  const [scenarioName, setScenarioName] = useState('');
  const [newIncome, setNewIncome] = useState('');
  const [newExpense, setNewExpense] = useState('');
  const [oneTimeIncome, setOneTimeIncome] = useState('');
  const [oneTimeExpense, setOneTimeExpense] = useState('');

  const calculateImpact = () => {
    const monthlyIncome = parseFloat(newIncome) || 0;
    const monthlyExpense = parseFloat(newExpense) || 0;
    const oneIncome = parseFloat(oneTimeIncome) || 0;
    const oneExpense = parseFloat(oneTimeExpense) || 0;

    // Calculate impact over 60 days (2 months)
    const monthlyImpact = (monthlyIncome - monthlyExpense) * 2;
    const oneTimeImpact = oneIncome - oneExpense;
    const totalImpact = monthlyImpact + oneTimeImpact;
    const projectedBalance = currentBalance + totalImpact;

    return {
      monthlyNet: monthlyIncome - monthlyExpense,
      totalImpact,
      projectedBalance,
      isPositive: totalImpact >= 0,
    };
  };

  const impact = calculateImpact();

  const handleReset = () => {
    setScenarioName('');
    setNewIncome('');
    setNewExpense('');
    setOneTimeIncome('');
    setOneTimeExpense('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>What If? Scenario</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Simulate how changes to your income or expenses would affect your finances over
              the next 60 days.
            </Text>

            <Text style={styles.label}>Scenario Name (Optional)</Text>
            <TextInput
              style={styles.input}
              value={scenarioName}
              onChangeText={setScenarioName}
              placeholder="e.g., New job, Big purchase"
              placeholderTextColor={brandColors.textGray}
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monthly Changes</Text>

              <Text style={styles.label}>Additional Monthly Income</Text>
              <TextInput
                style={styles.input}
                value={newIncome}
                onChangeText={setNewIncome}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={brandColors.textGray}
              />

              <Text style={styles.label}>Additional Monthly Expenses</Text>
              <TextInput
                style={styles.input}
                value={newExpense}
                onChangeText={setNewExpense}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>One-Time Changes</Text>

              <Text style={styles.label}>One-Time Income</Text>
              <TextInput
                style={styles.input}
                value={oneTimeIncome}
                onChangeText={setOneTimeIncome}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={brandColors.textGray}
              />

              <Text style={styles.label}>One-Time Expense</Text>
              <TextInput
                style={styles.input}
                value={oneTimeExpense}
                onChangeText={setOneTimeExpense}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={brandColors.textGray}
              />
            </View>

            {/* Impact Summary */}
            <View style={styles.impactCard}>
              <Text style={styles.impactTitle}>60-Day Impact Summary</Text>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Current Balance:</Text>
                <Text style={styles.impactValue}>${currentBalance.toFixed(2)}</Text>
              </View>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Monthly Net Change:</Text>
                <Text
                  style={[
                    styles.impactValue,
                    impact.monthlyNet >= 0 ? styles.positiveValue : styles.negativeValue,
                  ]}
                >
                  {impact.monthlyNet >= 0 ? '+' : ''}${impact.monthlyNet.toFixed(2)}
                </Text>
              </View>

              <View style={styles.impactRow}>
                <Text style={styles.impactLabel}>Total 60-Day Impact:</Text>
                <Text
                  style={[
                    styles.impactValue,
                    styles.impactValueBold,
                    impact.isPositive ? styles.positiveValue : styles.negativeValue,
                  ]}
                >
                  {impact.isPositive ? '+' : ''}${impact.totalImpact.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.impactRow, styles.projectedRow]}>
                <Text style={styles.projectedLabel}>Projected Balance:</Text>
                <Text
                  style={[
                    styles.projectedValue,
                    impact.projectedBalance >= 0
                      ? styles.positiveValue
                      : styles.negativeValue,
                  ]}
                >
                  ${impact.projectedBalance.toFixed(2)}
                </Text>
              </View>

              {impact.projectedBalance < 0 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Warning: This scenario would result in a negative balance
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.lightGray,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: brandColors.textGray,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: brandColors.textGray,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 12,
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
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
  },
  impactCard: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: brandColors.textDark,
    marginBottom: 16,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactLabel: {
    fontSize: 14,
    color: brandColors.textGray,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  impactValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveValue: {
    color: brandColors.green,
  },
  negativeValue: {
    color: brandColors.red,
  },
  projectedRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
  },
  projectedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: brandColors.textDark,
  },
  projectedValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningBox: {
    backgroundColor: brandColors.red + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: brandColors.red,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: brandColors.lightGray,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brandColors.lightGray,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: brandColors.primaryBlue,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
