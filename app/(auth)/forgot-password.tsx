import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors, typography, spacing, radius } from '../constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (email) {
      setSubmitted(true);
      // In production, send reset email here
    }
  };

  if (submitted) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We&apos;ve sent password reset instructions to {email}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send you reset instructions
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.gray400}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={!email}
        >
          <Text style={styles.buttonText}>Send Reset Link</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
  },
  form: {
    marginBottom: spacing['2xl'],
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.gray900,
    backgroundColor: colors.gray50,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
});
