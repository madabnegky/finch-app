// packages/mobile/src/components/WelcomeModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FinchLogo from './FinchLogo';
import brandColors from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type WelcomeModalProps = {
  visible: boolean;
  onStartTour?: () => void; // Optional now - we're removing the tour
  onSkip: () => void;
};

type WelcomeSlide = {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  video?: any; // Optional video source
};

const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    icon: 'bird',
    iconColor: brandColors.orangeAccent,
    title: 'Welcome to Finch',
    description: 'Your smart financial companion that helps you spend confidently and avoid overdrafts.',
  },
  {
    icon: 'cash-multiple',
    iconColor: brandColors.success,
    title: 'Available to Spend',
    description: 'This is the most important number! It shows how much you can safely spend right now, after accounting for bills, safety cushion, and savings.',
    video: require('../assets/videos/available-to-spend.mp4'),
  },
  {
    icon: 'calculator',
    iconColor: brandColors.tealPrimary,
    title: 'Test Before You Buy',
    description: 'Use "What If?" to see how a purchase will affect your finances before you make it.',
    video: require('../assets/videos/what-if.mp4'),
  },
  {
    icon: 'calendar',
    iconColor: '#F59E0B',
    title: 'Calendar View',
    description: 'See your available balance at any point in the next year by using the calendar view! Here you\'ll see any bills or income scheduled for that day, too!',
    video: require('../assets/videos/calendar-view.mp4'),
  },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  visible,
  onStartTour,
  onSkip,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === WELCOME_SLIDES.length - 1;
  const currentData = WELCOME_SLIDES[currentSlide];

  const handleNext = () => {
    if (isLastSlide) {
      // No more tour - just close the welcome modal
      onSkip();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    setCurrentSlide(0); // Reset for next time
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleSkip}
    >
      <View style={styles.container}>
        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          {currentSlide === 0 && (
            <View style={styles.logoContainer}>
              <FinchLogo size={80} />
            </View>
          )}

          {/* Icon or Video */}
          {currentData.video ? (
            <View style={styles.videoContainer}>
              <Video
                source={currentData.video}
                style={styles.video}
                resizeMode="contain"
                repeat={true}
                muted={true}
                paused={false}
                controls={false}
                onError={(error) => console.error('Video error:', error)}
                onLoad={() => console.log('Video loaded successfully')}
              />
            </View>
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: currentData.iconColor + '15' }]}>
              <Icon name={currentData.icon} size={64} color={currentData.iconColor} />
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{currentData.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{currentData.description}</Text>

          {/* Progress Dots */}
          <View style={styles.progressDots}>
            {WELCOME_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentSlide && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.footer}>
          <View style={styles.navigationButtons}>
            {currentSlide > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
              >
                <Icon name="chevron-left" size={24} color={brandColors.textDark} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {isLastSlide ? 'Get Started' : 'Next'}
              </Text>
              <Icon name="chevron-right" size={24} color={brandColors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.white,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textGray,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
    paddingBottom: 120,
  },
  logoContainer: {
    marginBottom: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: brandColors.orangeAccent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  videoContainer: {
    width: SCREEN_WIDTH - 64,
    height: (SCREEN_WIDTH - 64) * 0.75, // 4:3 aspect ratio
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: brandColors.textDark,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 18,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
    maxWidth: SCREEN_WIDTH - 64,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.border,
  },
  dotActive: {
    backgroundColor: brandColors.orangeAccent,
    width: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: brandColors.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: brandColors.border,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brandColors.tealPrimary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: brandColors.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
  },
});
