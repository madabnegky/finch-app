// packages/mobile/src/components/OnboardingOverlay.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import brandColors from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OnboardingStep = {
  title: string;
  description: string;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tooltipPosition: 'top' | 'bottom' | 'center';
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
};

type OnboardingOverlayProps = {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Finch!',
    description: "Let's take a quick tour to show you around. We'll highlight the most important features to help you get started with managing your finances.",
    tooltipPosition: 'center',
  },
  {
    title: 'Add Your First Account',
    description: "Tap the + button to add accounts and transactions. Start by adding an account (manually or with Plaid), then add your recurring transactions like paychecks and bills.",
    tooltipPosition: 'bottom',
    arrowDirection: 'down',
    highlightArea: {
      x: SCREEN_WIDTH - 96,
      y: SCREEN_HEIGHT - 96,
      width: 76,
      height: 76,
    },
  },
  {
    title: 'Your Projected Balance',
    description: "This 60-day outlook shows where your finances are heading. The 'Projected Low' tells you the lowest your balance will drop in the next 60 days - this is the most important number to watch!",
    tooltipPosition: 'bottom',
    arrowDirection: 'up',
    highlightArea: {
      x: 24,
      y: 280,
      width: SCREEN_WIDTH - 48,
      height: 160,
    },
  },
  {
    title: 'Understanding Your Balances',
    description: "Each account shows three key numbers:\n\n• Balance: Your current account balance\n• Available: What you can actually spend (Balance - Cushion - Goal allocations)\n• Cushion: A safety buffer you set to avoid overdrafts",
    tooltipPosition: 'bottom',
    arrowDirection: 'up',
    highlightArea: {
      x: 24,
      y: 460,
      width: SCREEN_WIDTH - 48,
      height: 140,
    },
  },
  {
    title: 'Explore More Features',
    description: "Open the menu to access:\n\n• Calendar: See your daily projected balances\n• Goals: Track savings with envelope budgeting\n• Reports: Analyze your spending patterns\n• Transactions: Manage all your income and bills",
    tooltipPosition: 'center',
  },
];

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const renderTooltip = () => {
    let tooltipStyle = [styles.tooltip];

    if (currentStepData.tooltipPosition === 'top') {
      tooltipStyle.push(styles.tooltipTop);
    } else if (currentStepData.tooltipPosition === 'bottom') {
      tooltipStyle.push(styles.tooltipBottom);
    } else {
      tooltipStyle.push(styles.tooltipCenter);
    }

    return (
      <View style={tooltipStyle}>
        {/* Arrow indicator */}
        {currentStepData.arrowDirection && (
          <View style={[
            styles.arrow,
            currentStepData.arrowDirection === 'up' && styles.arrowUp,
            currentStepData.arrowDirection === 'down' && styles.arrowDown,
          ]}>
            <Icon
              name={
                currentStepData.arrowDirection === 'up' ? 'arrow-up' :
                currentStepData.arrowDirection === 'down' ? 'arrow-down' :
                currentStepData.arrowDirection === 'left' ? 'arrow-left' : 'arrow-right'
              }
              size={32}
              color={brandColors.orangeAccent}
            />
          </View>
        )}

        <View style={styles.tooltipContent}>
          <Text style={styles.tooltipTitle}>{currentStepData.title}</Text>
          <Text style={styles.tooltipDescription}>{currentStepData.description}</Text>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {ONBOARDING_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip Tour</Text>
            </TouchableOpacity>

            <View style={styles.navButtons}>
              {!isFirstStep && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Get Started' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        {/* Semi-transparent backdrop */}
        <View style={styles.backdrop} />

        {/* Highlight area (cut-out effect would require SVG or canvas, using simple positioning for now) */}
        {currentStepData.highlightArea && (
          <View
            style={[
              styles.highlightBorder,
              {
                top: currentStepData.highlightArea.y - 4,
                left: currentStepData.highlightArea.x - 4,
                width: currentStepData.highlightArea.width + 8,
                height: currentStepData.highlightArea.height + 8,
              },
            ]}
          />
        )}

        {/* Tooltip */}
        {renderTooltip()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: brandColors.orangeAccent,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  tooltip: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: brandColors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipTop: {
    top: 60,
  },
  tooltipBottom: {
    bottom: 100,
  },
  tooltipCenter: {
    top: '30%',
  },
  tooltipContent: {
    gap: 16,
  },
  arrow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowUp: {
    top: -40,
    left: '50%',
    marginLeft: -16,
  },
  arrowDown: {
    bottom: -40,
    left: '50%',
    marginLeft: -16,
  },
  tooltipTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: brandColors.tealDark,
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 16,
    color: brandColors.textDark,
    lineHeight: 24,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.lightGray,
  },
  dotActive: {
    backgroundColor: brandColors.orangeAccent,
    width: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    color: brandColors.textGray,
    fontWeight: '600',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: brandColors.lightGray,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: brandColors.tealPrimary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.white,
  },
});
