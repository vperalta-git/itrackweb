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

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = () => {
    if (validateForm()) {
      // In production, call reset API
      router.replace('/(auth)/sign-in');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password</Text>
      </View>

      <View style={styles.form}>
        {/* Password Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Enter new password"
            placeholderTextColor={colors.gray400}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder="Confirm new password"
            placeholderTextColor={colors.gray400}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset Password</Text>
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
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
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
});
