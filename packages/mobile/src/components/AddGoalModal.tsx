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
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';
import { brandColors } from '../theme/colors';
import { validateAmount, validateGoalName, validateDate } from '../utils/validation';
import { formatErrorForAlert } from '../utils/errorMessages';

type AddGoalModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validate goal name
    const nameValidation = validateGoalName(name);
    if (!nameValidation.isValid) {
      Alert.alert('Invalid Input', nameValidation.error || 'Please enter a goal name');
      return;
    }

    // Validate target amount
    const amountValidation = validateAmount(targetAmount, {
      min: 1,
      max: 999999999,
      allowNegative: false,
      fieldName: 'Target amount',
    });
    if (!amountValidation.isValid) {
      Alert.alert('Invalid Input', amountValidation.error || 'Please enter a valid target amount');
      return;
    }

    // Validate deadline if provided
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const dateValidation = validateDate(deadlineDate, {
        allowPast: false,
        allowFuture: true,
        fieldName: 'Deadline',
      });
      if (!dateValidation.isValid) {
        Alert.alert('Invalid Input', dateValidation.error || 'Please check the deadline date');
        return;
      }
    }

    // Clean commas before parsing (parseFloat stops at commas, so "1,000" becomes 1)
    const target = parseFloat(targetAmount.replace(/,/g, '').replace(/[^\d.]/g, ''));

    try {
      setSaving(true);

      const goalData: any = {
        name: name.trim(),
        targetAmount: target,
        allocatedAmount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      if (deadline) {
        goalData.deadline = firestore.Timestamp.fromDate(new Date(deadline));
      }

      await firestore()
        .collection(`users/${user?.uid}/goals`)
        .add(goalData);

      // Reset form
      setName('');
      setTargetAmount('');
      setDeadline('');

      Alert.alert('Success', 'Goal added successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      const { title, message } = formatErrorForAlert(error);
      Alert.alert(title, message);
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
            <Text style={styles.title}>Add Goal / Envelope</Text>
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
              Set a target date to help track your progress and stay motivated
            </Text>
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
                {saving ? 'Saving...' : 'Save'}
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
