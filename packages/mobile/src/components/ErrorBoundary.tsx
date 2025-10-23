import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import crashlytics from '@react-native-firebase/crashlytics';
import brandColors from '../theme/colors';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them to Firebase Crashlytics, and displays a fallback UI.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Crashlytics for production monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    try {
      crashlytics().recordError(error);
      crashlytics().log(`Component Stack: ${errorInfo.componentStack}`);
    } catch (crashlyticsError) {
      console.error('Failed to log to Crashlytics:', crashlyticsError);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const { error, errorInfo } = this.state;

      return (
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <Icon name="alert-circle" size={80} color={brandColors.error} />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>
              {fallbackTitle || 'Oops! Something went wrong'}
            </Text>

            {/* Error Message */}
            <Text style={styles.message}>
              {fallbackMessage ||
                "We've been notified and are looking into it. Try restarting the screen or reloading the app."}
            </Text>

            {/* Try Again Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={20} color={brandColors.white} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            {/* Development Mode: Show Error Details */}
            {__DEV__ && error && (
              <View style={styles.devSection}>
                <Text style={styles.devTitle}>Development Info:</Text>

                <View style={styles.errorBox}>
                  <Text style={styles.errorLabel}>Error:</Text>
                  <Text style={styles.errorText}>{error.toString()}</Text>
                </View>

                {error.stack && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorLabel}>Stack Trace:</Text>
                    <Text style={styles.errorText}>{error.stack}</Text>
                  </View>
                )}

                {errorInfo && errorInfo.componentStack && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorLabel}>Component Stack:</Text>
                    <Text style={styles.errorText}>{errorInfo.componentStack}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.backgroundOffWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.textDark,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    color: brandColors.textGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brandColors.orangeAccent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: brandColors.orangeAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.white,
  },
  devSection: {
    marginTop: 40,
    width: '100%',
    paddingHorizontal: 10,
  },
  devTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textDark,
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#856404',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
