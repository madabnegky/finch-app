// Dashboard Concept Switcher
// Allows you to toggle between all 3 UI concepts in real-time

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';
import { DashboardConcept1 } from './DashboardConcept1';
import { DashboardConcept2 } from './DashboardConcept2';
import { DashboardConcept3 } from './DashboardConcept3';
import { DashboardConcept4 } from './DashboardConcept4';

export const DashboardConceptSwitcher = () => {
  const [selectedConcept, setSelectedConcept] = useState<1 | 2 | 3 | 4>(4);
  const [showSwitcher, setShowSwitcher] = useState(true);

  const concepts = [
    { id: 1, name: 'Hero Card', description: 'Bold & Simple' },
    { id: 2, name: 'Executive', description: 'Data-Focused' },
    { id: 3, name: 'Card Stack', description: 'Comprehensive' },
    { id: 4, name: 'Executive+', description: 'Refined & Clean' },
  ];

  const renderConcept = () => {
    switch (selectedConcept) {
      case 1:
        return <DashboardConcept1 />;
      case 2:
        return <DashboardConcept2 />;
      case 3:
        return <DashboardConcept3 />;
      case 4:
        return <DashboardConcept4 />;
      default:
        return <DashboardConcept4 />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Floating Switcher Button (when collapsed) */}
      {!showSwitcher && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setShowSwitcher(true)}
        >
          <Icon name="palette" size={24} color={brandColors.white} />
        </TouchableOpacity>
      )}

      {/* Concept Switcher Bar (when expanded) */}
      {showSwitcher && (
        <SafeAreaView style={styles.switcherContainer}>
          <View style={styles.switcherContent}>
            <View style={styles.switcherHeader}>
              <View style={styles.switcherTitleRow}>
                <Icon name="palette" size={20} color={brandColors.orangeAccent} />
                <Text style={styles.switcherTitle}>UI Concept Preview</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSwitcher(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={20} color={brandColors.textGray} />
              </TouchableOpacity>
            </View>

            <View style={styles.conceptButtons}>
              {concepts.map((concept) => (
                <TouchableOpacity
                  key={concept.id}
                  style={[
                    styles.conceptButton,
                    selectedConcept === concept.id && styles.conceptButtonActive,
                  ]}
                  onPress={() => setSelectedConcept(concept.id as 1 | 2 | 3 | 4)}
                >
                  <Text
                    style={[
                      styles.conceptButtonNumber,
                      selectedConcept === concept.id && styles.conceptButtonNumberActive,
                    ]}
                  >
                    {concept.id}
                  </Text>
                  <View style={styles.conceptButtonText}>
                    <Text
                      style={[
                        styles.conceptButtonName,
                        selectedConcept === concept.id && styles.conceptButtonNameActive,
                      ]}
                    >
                      {concept.name}
                    </Text>
                    <Text
                      style={[
                        styles.conceptButtonDesc,
                        selectedConcept === concept.id && styles.conceptButtonDescActive,
                      ]}
                    >
                      {concept.description}
                    </Text>
                  </View>
                  {selectedConcept === concept.id && (
                    <Icon name="check-circle" size={20} color={brandColors.orangeAccent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Render Selected Concept */}
      <View style={styles.conceptContainer}>
        {renderConcept()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },

  // Floating Button (collapsed state)
  floatingButton: {
    position: 'absolute',
    top: 60,
    right: 20,
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
    zIndex: 1000,
  },

  // Switcher Bar (expanded state)
  switcherContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: brandColors.white,
    borderBottomWidth: 2,
    borderBottomColor: brandColors.orangeAccent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  switcherContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  switcherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switcherTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switcherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },
  closeButton: {
    padding: 4,
  },

  // Concept Buttons
  conceptButtons: {
    gap: 8,
  },
  conceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  conceptButtonActive: {
    backgroundColor: brandColors.tealPrimary + '10',
    borderColor: brandColors.orangeAccent,
  },
  conceptButtonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brandColors.white,
    borderWidth: 2,
    borderColor: brandColors.border,
    fontSize: 16,
    fontWeight: '800',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 28,
  },
  conceptButtonNumberActive: {
    backgroundColor: brandColors.orangeAccent,
    borderColor: brandColors.orangeAccent,
    color: brandColors.white,
  },
  conceptButtonText: {
    flex: 1,
  },
  conceptButtonName: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 2,
  },
  conceptButtonNameActive: {
    color: brandColors.tealPrimary,
  },
  conceptButtonDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: brandColors.textGray,
  },
  conceptButtonDescActive: {
    color: brandColors.tealPrimary,
  },

  // Concept Container
  conceptContainer: {
    flex: 1,
  },
});
