// packages/mobile/src/components/CustomTooltip.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import brandColors from '../theme/colors';

interface CustomTooltipProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  handleNext: () => void;
  handlePrev: () => void;
  handleStop: () => void;
  currentStep: {
    text: string;
  };
  labels?: {
    skip?: string;
    previous?: string;
    next?: string;
    finish?: string;
  };
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
  currentStep,
  labels,
}) => {
  return (
    <View style={styles.tooltipContainer}>
      <View style={styles.textContainer}>
        <Text style={styles.tooltipText}>{currentStep && currentStep.text}</Text>
      </View>
      <View style={styles.buttonBar}>
        {!isLastStep && (
          <TouchableOpacity onPress={handleStop} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>{labels?.skip || 'Skip'}</Text>
          </TouchableOpacity>
        )}
        {!isFirstStep && (
          <TouchableOpacity onPress={handlePrev} style={styles.button}>
            <Text style={styles.buttonText}>{labels?.previous || 'Previous'}</Text>
          </TouchableOpacity>
        )}
        {!isLastStep ? (
          <TouchableOpacity onPress={handleNext} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{labels?.next || 'Next'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleStop} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{labels?.finish || 'Finish'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tooltipContainer: {
    borderRadius: 16,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    width: '80%',
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  tooltipText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: brandColors.white,
    fontWeight: '500',
  },
  buttonBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  skipButton: {
    padding: 10,
    marginRight: 'auto',
  },
  skipButtonText: {
    color: brandColors.white,
    fontSize: 14,
    opacity: 0.8,
  },
  button: {
    padding: 10,
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: brandColors.white,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: brandColors.tealPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
