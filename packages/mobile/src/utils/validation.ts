/**
 * Input Validation Utilities
 * Provides consistent validation across the app for financial inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate monetary amounts (account balances, transaction amounts, etc.)
 */
export const validateAmount = (
  value: string | number,
  options: {
    min?: number;
    max?: number;
    allowNegative?: boolean;
    fieldName?: string;
  } = {}
): ValidationResult => {
  const {
    min = 0.01,
    max = 999999999,
    allowNegative = false,
    fieldName = 'Amount',
  } = options;

  // Convert to number if string - clean commas first (parseFloat stops at commas)
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '').replace(/[^\d.-]/g, '')) : value;

  // Check if empty or invalid
  if (value === '' || value === null || value === undefined) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Check if valid number
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  // Check negative values
  if (!allowNegative && numValue < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }

  // Check minimum
  if (numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least $${min.toFixed(2)}`,
    };
  }

  // Check maximum
  if (numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed $${max.toLocaleString()}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate account names
 */
export const validateAccountName = (name: string): ValidationResult => {
  // Check if empty
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Account name is required' };
  }

  // Check minimum length
  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Account name must be at least 2 characters',
    };
  }

  // Check maximum length
  if (name.length > 50) {
    return {
      isValid: false,
      error: 'Account name must be 50 characters or less',
    };
  }

  return { isValid: true };
};

/**
 * Validate goal names
 */
export const validateGoalName = (name: string): ValidationResult => {
  // Check if empty
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Goal name is required' };
  }

  // Check minimum length
  if (name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Goal name must be at least 2 characters',
    };
  }

  // Check maximum length
  if (name.length > 50) {
    return {
      isValid: false,
      error: 'Goal name must be 50 characters or less',
    };
  }

  return { isValid: true };
};

/**
 * Validate transaction descriptions
 */
export const validateDescription = (
  description: string,
  required: boolean = false
): ValidationResult => {
  // Check if required and empty
  if (required && (!description || description.trim().length === 0)) {
    return { isValid: false, error: 'Description is required' };
  }

  // Check maximum length
  if (description && description.length > 100) {
    return {
      isValid: false,
      error: 'Description must be 100 characters or less',
    };
  }

  return { isValid: true };
};

/**
 * Validate email addresses
 */
export const validateEmail = (email: string): ValidationResult => {
  // Check if empty
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Validate passwords
 */
export const validatePassword = (password: string): ValidationResult => {
  // Check if empty
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  // Check minimum length (Firebase requires 6+)
  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters',
    };
  }

  // Check maximum length
  if (password.length > 100) {
    return {
      isValid: false,
      error: 'Password must be 100 characters or less',
    };
  }

  return { isValid: true };
};

/**
 * Validate dates
 */
export const validateDate = (
  date: Date | string | null | undefined,
  options: {
    allowPast?: boolean;
    allowFuture?: boolean;
    fieldName?: string;
  } = {}
): ValidationResult => {
  const { allowPast = true, allowFuture = true, fieldName = 'Date' } = options;

  // Check if empty
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  // Convert to Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  // Check past dates
  if (!allowPast && dateObj < new Date()) {
    return {
      isValid: false,
      error: `${fieldName} cannot be in the past`,
    };
  }

  // Check future dates
  if (!allowFuture && dateObj > new Date()) {
    return {
      isValid: false,
      error: `${fieldName} cannot be in the future`,
    };
  }

  return { isValid: true };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Parse currency input (removes $, commas, etc.)
 */
export const parseCurrencyInput = (input: string): number => {
  // Remove everything except digits, decimal point, and minus sign
  const cleaned = input.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};
