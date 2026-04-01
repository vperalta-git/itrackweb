import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';
import { Input, Button, Checkbox } from '../components';
import { useForm } from '../hooks/useForm';
import FormValidator from '../utils/validation';

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function SignInScreen() {
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState('');

  const form = useForm<SignInFormData>({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: (values) =>
      FormValidator.validateSignIn({
        email: values.email,
        password: values.password,
      }),
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: async (values) => {
      setSubmitError('');
      try {
        await login(values.email, values.password);
        router.replace('/(tabs)/(admin)/dashboard');
      } catch (error) {
        setSubmitError('Invalid email or password. Please try again.');
      }
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>I-TRACK</Text>
          <Text style={styles.subtitle}>Fleet Management System</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Error Alert */}
          {submitError && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{submitError}</Text>
            </View>
          )}

          {/* Email Input */}
          <Input
            label="Email Address"
            placeholder="your@email.com"
            value={form.values.email}
            onChangeText={(value) => form.setFieldValue('email', value)}
            onBlur={() => form.setFieldTouched('email')}
            error={form.touched.email ? form.errors.email : undefined}
            keyboardType="email-address"
            editable={!form.isSubmitting}
          />

          {/* Password Input */}
          <Input
            label="Password"
            placeholder="Enter your password"
            value={form.values.password}
            onChangeText={(value) => form.setFieldValue('password', value)}
            onBlur={() => form.setFieldTouched('password')}
            error={form.touched.password ? form.errors.password : undefined}
            secureTextEntry
            editable={!form.isSubmitting}
          />

          {/* Remember Me */}
          <Checkbox
            value={form.values.rememberMe}
            onValueChange={(value) => form.setFieldValue('rememberMe', value)}
            label="Remember me"
            disabled={form.isSubmitting}
            style={styles.rememberMe}
          />

          {/* Sign In Button */}
          <Button
            title="Sign In"
            onPress={form.handleSubmit}
            loading={form.isSubmitting}
            disabled={form.isSubmitting}
            fullWidth
            size="large"
            style={styles.signInButton}
          />

          {/* Forgot Password Link */}
          <Button
            title="Forgot Password?"
            variant="ghost"
            onPress={() => router.push('/(auth)/forgot-password')}
            disabled={form.isSubmitting}
            fullWidth
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 I-TRACK. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.gray500,
    fontFamily: theme.fonts.family.sans,
  },
  form: {
    marginBottom: 24,
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger,
  },
  errorAlertText: {
    fontSize: 13,
    color: '#991b1b',
    fontFamily: theme.fonts.family.sans,
  },
  rememberMe: {
    marginBottom: 16,
  },
  signInButton: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.gray500,
    fontFamily: theme.fonts.family.sans,
  },
});
