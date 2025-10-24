import React, { useState, useEffect } from 'react';
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
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  deadline?: any;
};

type EditGoalModalProps = {
  visible: boolean;
  goal: Goal;
  onClose: () => void;
  onSuccess?: () => void;
};

export const EditGoalModal: React.FC<EditGoalModalProps> = ({
  visible,
  goal,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      if (goal.deadline) {
        const deadlineDate = goal.deadline.toDate ? goal.deadline.toDate() : new Date(goal.deadline);
        setDeadline(deadlineDate.toISOString().split('T')[0]);
      } else {
        setDeadline('');
      }
    }
  }, [goal]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal name');
      return;
    }

    // Clean commas before parsing (parseFloat stops at commas, so "1,000" becomes 1)
    const cleanAmount = targetAmount.replace(/,/g, '').replace(/[^\d.]/g, '');
    if (!targetAmount || parseFloat(cleanAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid target amount');
      return;
    }

    const target = parseFloat(cleanAmount);

    if (goal.allocatedAmount > target) {
      Alert.alert('Invalid', 'Target amount cannot be less than already allocated amount');
      return;
    }

    // Validate deadline format if provided
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    try {
      setSaving(true);

      const updateData: any = {
        name: name.trim(),
        targetAmount: target,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (deadline) {
        updateData.deadline = firestore.Timestamp.fromDate(new Date(deadline));
      } else {
        updateData.deadline = null;
      }

      await firestore()
        .collection(`users/${user?.uid}/goals`)
        .doc(goal.id)
        .update(updateData);

      Alert.alert('Success', 'Goal updated successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.title}>Edit Goal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Goal Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Emergency Fund, Vacation"
              placeholderTextColor={brandColors.textGray}
            />

            <Text style={styles.label}>Target Amount (USD)</Text>
            <TextInput
              style={styles.input}
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={brandColors.textGray}
            />

            <Text style={styles.label}>Deadline (Optional)</Text>
            <TextInput
              style={styles.input}
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD (e.g., 2025-12-31)"
              placeholderTextColor={brandColors.textGray}
            />
            <Text style={styles.helperText}>
              Set a target date to help track your progress
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Currently allocated: ${goal.allocatedAmount.toFixed(2)}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
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
    maxHeight: '80%',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
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
  helperText: {
    fontSize: 12,
    color: brandColors.textGray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: brandColors.tealLight + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: brandColors.tealDark,
    fontWeight: '600',
  },
  footer: {
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
