/**
 * Consistent Modal Styling System
 * Use these shared styles across all modals for a professional, cohesive look
 */

import { StyleSheet } from 'react-native';
import { brandColors } from './colors';

export const modalStyles = StyleSheet.create({
  // Overlay (backdrop behind modal)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end', // Bottom sheet style
  },

  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Center modal
    alignItems: 'center',
    padding: 20,
  },

  // Main modal container
  container: {
    backgroundColor: brandColors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 40, // Extra padding for safe area
    maxHeight: '90%',
  },

  containerCenter: {
    backgroundColor: brandColors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },

  // Drag handle (iOS-style)
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: brandColors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginVertical: 8,
  },

  // Content wrapper with padding
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Header section
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 24,
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    letterSpacing: -0.5,
    flex: 1,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 4,
    lineHeight: 20,
  },

  // Close button
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brandColors.backgroundOffWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: brandColors.textGray,
  },

  // Form elements
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },

  labelRequired: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textDark,
    marginBottom: 8,
    marginTop: 16,
  },

  requiredAsterisk: {
    color: brandColors.error,
    marginLeft: 4,
  },

  input: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: brandColors.textDark,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  inputFocused: {
    borderColor: brandColors.tealPrimary,
    backgroundColor: brandColors.white,
  },

  inputError: {
    borderColor: brandColors.error,
  },

  // Helper text
  helperText: {
    fontSize: 13,
    fontWeight: '500',
    color: brandColors.textGray,
    marginTop: 6,
    marginLeft: 4,
  },

  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: brandColors.error,
    marginTop: 6,
    marginLeft: 4,
  },

  // Section divider
  divider: {
    height: 1,
    backgroundColor: brandColors.border,
    marginVertical: 24,
  },

  // Button container (footer)
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  buttonContainerVertical: {
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  // Primary button
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: brandColors.tealPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brandColors.tealPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  primaryButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
    letterSpacing: 0.5,
  },

  // Secondary button
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: brandColors.backgroundOffWhite,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brandColors.border,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors.textDark,
  },

  // Danger button (for delete actions)
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: brandColors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brandColors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
    letterSpacing: 0.5,
  },

  // Link button (text only)
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  linkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.tealPrimary,
  },

  // Loading indicator position
  loadingIndicator: {
    marginRight: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyStateIcon: {
    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 10,
    padding: 4,
  },

  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },

  segmentSelected: {
    backgroundColor: brandColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: brandColors.textGray,
  },

  segmentTextSelected: {
    color: brandColors.tealPrimary,
    fontWeight: '700',
  },

  // Card/Section
  card: {
    backgroundColor: brandColors.backgroundOffWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
  },

  cardText: {
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textGray,
    lineHeight: 20,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: brandColors.tealPrimary + '15',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.tealPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: brandColors.tealPrimary + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },

  infoBoxIcon: {
    marginRight: 12,
  },

  infoBoxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
    lineHeight: 20,
  },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: brandColors.orangeAccent + '10',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },

  warningBoxIcon: {
    marginRight: 12,
  },

  warningBoxText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: brandColors.textDark,
    lineHeight: 20,
  },
});

/**
 * Helper function to combine modal styles
 * Usage: StyleSheet.create({ ...createModalStyles() })
 */
export const createModalStyles = () => modalStyles;

/**
 * Color variants for badges
 */
export const badgeVariants = {
  primary: {
    backgroundColor: brandColors.tealPrimary + '15',
    color: brandColors.tealPrimary,
  },
  success: {
    backgroundColor: brandColors.success + '15',
    color: brandColors.success,
  },
  warning: {
    backgroundColor: brandColors.orangeAccent + '15',
    color: brandColors.orangeAccent,
  },
  error: {
    backgroundColor: brandColors.error + '15',
    color: brandColors.error,
  },
  neutral: {
    backgroundColor: brandColors.textGray + '15',
    color: brandColors.textGray,
  },
};
