/**
 * Finch App Color Palette
 * Derived from the Finch logo for a cohesive, professional brand experience
 */

export const brandColors = {
  // Primary Brand Colors (from logo)
  tealDark: '#2B5266',      // Deep slate-teal from logo background
  tealPrimary: '#3A6B82',   // Primary interactive teal
  tealLight: '#5A8FA8',     // Lighter teal for hover/active states
  orangeAccent: '#F5A52D',  // Warm orange from the finch
  orangeLight: '#FFB84D',   // Lighter orange for highlights

  // Neutral Colors
  white: '#FFFFFF',
  backgroundOffWhite: '#F8F9FA',
  cardBackground: '#FFFFFF',
  textDark: '#1F2937',
  textGray: '#6B7280',
  lightGray: '#E5E7EB',
  border: '#E5E7EB',

  // Status Colors
  success: '#10B981',
  warning: '#F5A52D',  // Using orange as warning color
  error: '#EF4444',

  // Legacy support (will be deprecated)
  primaryBlue: '#3A6B82',  // Mapped to tealPrimary
  green: '#10B981',
  red: '#EF4444',
  amber: '#F5A52D',
};

export type BrandColors = typeof brandColors;

// Export for easy destructuring
export default brandColors;
