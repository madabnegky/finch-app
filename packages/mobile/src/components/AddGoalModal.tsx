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
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../shared-logic/src/hooks/useAuth';

const brandColors = {
  primaryBlue: '#4F46E5',
  backgroundOffWhite: '#F8F9FA',
  textDark: '#1F2937',
  textGray: '#6B7280',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
};

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
  const [currentAmount, setCurrentAmount] = useState('0');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal name');
      return;
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid target amount');
      return;
    }

    const current = parseFloat(currentAmount) || 0;
    const target = parseFloat(targetAmount);

    if (current < 0) {
      Alert.alert('Invalid', 'Current amount cannot be negative');
      return;
    }

    if (current > target) {
      Alert.alert('Invalid', 'Current amount cannot exceed target amount');
      return;
    }

    try {
      setSaving(true);

      await firestore()
        .collection(`users/${user?.uid}/goals`)
        .add({
          name: name.trim(),
          targetAmount: target,
          currentAmount: current,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Reset form
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');

      Alert.alert('Success', 'Goal added successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
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

            <Text style={styles.label}>Current Amount (USD)</Text>
            <TextInput
              style={styles.input}
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={brandColors.textGray}
            />

            <Text style={styles.helperText}>
              Optional: Enter how much you've already saved towards this goal
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
    backgroundColor: brandColors.primaryBlue,
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
