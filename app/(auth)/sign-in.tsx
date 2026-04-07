import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { getDefaultRouteForRole } from '@/src/mobile/navigation/access';
import FormValidator from '@/src/mobile/utils/validation';
import { useForm } from '@/src/mobile/hooks/useForm';
import {
  AppScreen,
  Button,
  Checkbox,
  Input,
} from '@/src/mobile/components';
import { brandLogo } from '@/src/mobile/constants/assets';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';

interface SignInFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function SignInScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
        const signedInUser = await login(values.email.trim(), values.password);
        router.replace(getDefaultRouteForRole(signedInUser.role) as any);
      } catch (error) {
        void error;
        setSubmitError('Invalid email or password. Please try again.');
      }
    },
  });

  const handleEmailChange = (value: string) => {
    if (submitError) {
      setSubmitError('');
    }
    form.setFieldValue('email', value);
  };

  const handlePasswordChange = (value: string) => {
    if (submitError) {
      setSubmitError('');
    }
    form.setFieldValue('password', value);
  };

  const handleSignIn = () => {
    setHasSubmitted(true);
    form.setFieldTouched('email');
    form.setFieldTouched('password');
    form.handleSubmit();
  };

  return (
    <AppScreen contentContainerStyle={styles.contentContainer}>
      <View style={styles.hero}>
        <Image source={brandLogo} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.title}>I-TRACK</Text>
        <Text style={styles.subtitle}>ISUZU's Vehicle Service Management System</Text>
      </View>

      <View style={styles.formShell}>
        {submitError ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={theme.colors.error}
            />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        <Input
          label="Email address"
          placeholder="you@itrack.com"
          value={form.values.email}
          onChangeText={handleEmailChange}
          onBlur={() => form.setFieldTouched('email')}
          error={form.touched.email || hasSubmitted ? form.errors.email : undefined}
          keyboardType="email-address"
          editable={!form.isSubmitting}
          icon={
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={form.values.password}
          onChangeText={handlePasswordChange}
          onBlur={() => form.setFieldTouched('password')}
          error={form.touched.password || hasSubmitted ? form.errors.password : undefined}
          secureTextEntry={!showPassword}
          editable={!form.isSubmitting}
          icon={
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          rightIcon={
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          onRightIconPress={() => setShowPassword((current) => !current)}
        />

        <View style={styles.formRow}>
          <Checkbox
            value={form.values.rememberMe}
            onValueChange={(value) => form.setFieldValue('rememberMe', value)}
            label="Remember me"
            disabled={form.isSubmitting}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotPasswordLink}
            disabled={form.isSubmitting}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>

        <Button
          title="Sign In"
          onPress={handleSignIn}
          loading={form.isSubmitting}
          disabled={form.isSubmitting}
          fullWidth
          size="large"
          style={styles.submitButton}
        />
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    contentContainer: {
      justifyContent: 'center',
      paddingVertical: theme.spacing['2xl'],
    },
    hero: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    logoImage: {
      marginBottom: theme.spacing.base,
      width: 90,
      height: 90,
    },
    title: {
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '700',
      textAlign: 'center',
      color: theme.colors.primary,
      letterSpacing: 0.4,
      fontFamily: theme.fonts.family.sans,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontFamily: theme.fonts.family.sans,
    },
    formShell: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingTop: theme.spacing.sm,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorLight,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.error,
      fontFamily: theme.fonts.family.sans,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.base,
    },
    forgotPasswordLink: {
      paddingVertical: theme.spacing.xs,
    },
    forgotPasswordText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.family.sans,
    },
    submitButton: {
      marginTop: theme.spacing.xs,
    },
  });
