/**
 * Finch App Color Palette - Professional Minimal Design
 * Updated: November 2025
 *
 * IMPORTANT: This is a visual redesign - all old color names are maintained
 * for backward compatibility. New designs should use the NEW color names.
 */

export const brandColors = {
  // ===== NEW PROFESSIONAL MINIMAL PALETTE =====
  // Primary Colors
  primary: '#0066CC',           // Professional blue for primary actions
  primaryHover: '#0052A3',      // Darker blue for hover states
  primaryLight: '#E6F2FF',      // Very light blue for backgrounds

  // Background Colors
  background: '#F5F7FA',        // Light gray background
  cardBackground: '#FFFFFF',    // White cards

  // Text Colors
  textPrimary: '#1A1A1A',       // Near-black for primary text
  textSecondary: '#6B7280',     // Gray for secondary text
  textTertiary: '#9CA3AF',      // Lighter gray for tertiary text

  // Border Colors
  border: '#E8EBED',            // Subtle gray border
  borderLight: '#F5F7FA',       // Very light border

  // Status Colors
  success: '#059669',           // Green for success/income
  warning: '#D97706',           // Orange for warnings
  error: '#DC2626',             // Red for errors/expenses

  // ===== DEPRECATED - OLD COLORS (Mapped to new palette for compatibility) =====
  // These maintain backward compatibility but should be migrated to new names

  // Primary Brand Colors (from old logo-based palette)
  tealDark: '#0052A3',          // DEPRECATED: Use primaryHover instead
  tealPrimary: '#0066CC',       // DEPRECATED: Use primary instead
  tealLight: '#E6F2FF',         // DEPRECATED: Use primaryLight instead
  orangeAccent: '#D97706',      // DEPRECATED: Use warning instead
  orangeLight: '#F5A52D',       // DEPRECATED: Use warning instead

  // Neutral Colors (old names)
  white: '#FFFFFF',
  backgroundOffWhite: '#F5F7FA', // DEPRECATED: Use background instead
  textDark: '#1A1A1A',          // DEPRECATED: Use textPrimary instead
  textGray: '#6B7280',          // DEPRECATED: Use textSecondary instead
  lightGray: '#E8EBED',         // DEPRECATED: Use border instead

  // Legacy support (will be removed in future versions)
  primaryBlue: '#0066CC',       // DEPRECATED: Use primary instead
  green: '#059669',             // DEPRECATED: Use success instead
  red: '#DC2626',               // DEPRECATED: Use error instead
  amber: '#D97706',             // DEPRECATED: Use warning instead
};

export type BrandColors = typeof brandColors;

// Export for easy destructuring
export default brandColors;
