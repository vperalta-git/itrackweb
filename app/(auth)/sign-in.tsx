import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, radius } from '../constants/theme';

export default function SignInScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      // Navigation will be handled by the auth state in the root layout
      router.replace('/(tabs)/(admin)/dashboard');
    } catch (error) {
      Alert.alert('Sign In Failed', 'Invalid email or password');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>I-TRACK</Text>
        <Text style={styles.subtitle}>Fleet Management System</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Email Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="your@email.com"
            placeholderTextColor={colors.gray400}
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Password Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Enter your password"
            placeholderTextColor={colors.gray400}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            secureTextEntry
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Remember Me */}
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
          disabled={isLoading}
        >
          <View
            style={[
              styles.checkbox,
              rememberMe && styles.checkboxChecked,
            ]}
          >
            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.rememberMeText}>Remember me</Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, isLoading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => router.push('/(auth)/forgot-password')}
          disabled={isLoading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 I-TRACK. All rights reserved.
        </Text>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing['2xl'],
    alignItems: 'center',
  },
  logo: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray500,
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    borderRadius: radius.sm,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  rememberMeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray700,
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray500,
  },
});
