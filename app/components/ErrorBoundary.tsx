import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { theme } from '../constants/theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[v0] Error caught by boundary:', error);
    console.error('[v0] Error info:', errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                We&apos;re sorry for the inconvenience. Please try again.
              </Text>

              {__DEV__ && this.state.error && (
                <View style={styles.devErrorBox}>
                  <Text style={styles.devErrorTitle}>Error Details:</Text>
                  <Text style={styles.devErrorText}>
                    {this.state.error.message}
                  </Text>
                  <Text style={styles.devErrorStack}>
                    {this.state.error.stack}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={this.resetError}
              >
                <Text style={styles.resetButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gray900,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: theme.fonts.family.sans,
  },
  errorMessage: {
    fontSize: 14,
    color: theme.colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: theme.fonts.family.sans,
  },
  devErrorBox: {
    backgroundColor: theme.colors.gray100,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 24,
    width: '100%',
  },
  devErrorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
    marginBottom: 8,
    fontFamily: theme.fonts.family.sans,
  },
  devErrorText: {
    fontSize: 12,
    color: theme.colors.gray900,
    marginBottom: 8,
    fontFamily: theme.fonts.family.mono,
    fontWeight: '500',
  },
  devErrorStack: {
    fontSize: 10,
    color: theme.colors.gray700,
    fontFamily: theme.fonts.family.mono,
    lineHeight: 14,
  },
  resetButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
    fontFamily: theme.fonts.family.sans,
  },
});
