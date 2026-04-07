import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Button,
  Input,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from '@/src/mobile/lib/api';
import FormValidator from '@/src/mobile/utils/validation';

type RecoveryStage = 'email' | 'otp' | 'reset' | 'success';
type NoticeTone = 'info' | 'success';

export default function ForgotPasswordScreen() {
  const {
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPasswordWithOtp,
  } = useAuth();
  const [stage, setStage] = useState<RecoveryStage>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    message: string;
  } | null>(null);

  const hasRecoveryDraft = stage !== 'success' && [
    email,
    otpCode,
    password,
    confirmPassword,
  ].some((value) => value.trim().length > 0);

  const closeModal = () => {
    if (!hasRecoveryDraft) {
      router.back();
      return;
    }

    Alert.alert(
      'Discard recovery progress?',
      'Your entered email, OTP, or password changes will be lost.',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const setFieldError = (field: string, message?: string) => {
    setErrors((current) => {
      const next = { ...current };

      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }

      return next;
    });
  };

  const clearNotice = () => {
    setNotice(null);
  };

  const handleEmailSubmit = async () => {
    const value = email.trim().toLowerCase();

    if (!value) {
      setFieldError('email', 'Email is required');
      return;
    }

    if (!FormValidator.validateEmail(value)) {
      setFieldError('email', 'Enter a valid email address');
      return;
    }

    clearNotice();
    setFieldError('email');
    setIsSubmitting(true);

    try {
      const message = await requestPasswordResetOtp(value);

      setEmail(value);
      setOtpCode('');
      setStage('otp');
      setNotice({
        tone: 'info',
        message,
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'We could not send the OTP code right now. Please try again.'
      );
      const statusCode = getApiErrorStatus(error);

      if (statusCode && statusCode < 500) {
        setFieldError('email', message);
        return;
      }

      Alert.alert('Unable to Send OTP', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async () => {
    const value = otpCode.trim();

    if (!value) {
      setFieldError('otp', 'OTP code is required');
      return;
    }

    if (value.length < 6) {
      setFieldError('otp', 'Enter the 6-digit OTP code');
      return;
    }

    clearNotice();
    setFieldError('otp');
    setIsSubmitting(true);

    try {
      const message = await verifyPasswordResetOtp(email.trim(), value);

      setStage('reset');
      setNotice({
        tone: 'success',
        message,
      });
    } catch (error) {
      setFieldError(
        'otp',
        getApiErrorMessage(
          error,
          'We could not verify that OTP code. Please try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (!FormValidator.validatePassword(password)) {
      nextErrors.password = FormValidator.getPasswordRequirementsMessage();
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    clearNotice();
    setIsSubmitting(true);

    try {
      const message = await resetPasswordWithOtp({
        email: email.trim(),
        otpCode: otpCode.trim(),
        nextPassword: password,
      });

      setNotice({
        tone: 'success',
        message,
      });
      setStage('success');
    } catch (error) {
      Alert.alert(
        'Unable to Reset Password',
        getApiErrorMessage(
          error,
          'We could not reset your password right now. Please try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNotice = () => {
    if (!notice || stage === 'success') {
      return null;
    }

    const isSuccess = notice.tone === 'success';

    return (
      <View
        style={[
          styles.noticeCard,
          isSuccess ? styles.noticeCardSuccess : styles.noticeCardInfo,
        ]}
      >
        <Ionicons
          name={isSuccess ? 'checkmark-circle-outline' : 'information-circle-outline'}
          size={18}
          color={isSuccess ? theme.colors.primaryDark : theme.colors.primary}
        />
        <Text
          style={[
            styles.noticeText,
            isSuccess ? styles.noticeTextSuccess : styles.noticeTextInfo,
          ]}
        >
          {notice.message}
        </Text>
      </View>
    );
  };

  const renderStepContent = () => {
    if (stage === 'email') {
      return (
        <>
          <Text style={styles.eyebrow}>Forgot Password</Text>
          <Text style={styles.title}>Find your account</Text>
          <Text style={styles.subtitle}>
            Enter your work email so we can send you a one-time OTP code.
          </Text>

          {renderNotice()}

          <Input
            label="Email address"
            placeholder="you@itrack.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearNotice();
              if (errors.email) {
                setFieldError('email');
              }
            }}
            error={errors.email}
            editable={!isSubmitting}
            keyboardType="email-address"
            icon={
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors.textSubtle}
              />
            }
          />

          <Button
            title="Send OTP Code"
            onPress={handleEmailSubmit}
            loading={isSubmitting}
            fullWidth
            size="large"
          />
        </>
      );
    }

    if (stage === 'otp') {
      return (
        <>
          <Text style={styles.eyebrow}>OTP Verification</Text>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit OTP code to {email.trim()}. Enter it to continue.
          </Text>

          {renderNotice()}

          <Input
            label="OTP code"
            placeholder="Enter 6-digit code"
            value={otpCode}
            onChangeText={(value) => {
              const nextValue = value.replace(/[^0-9]/g, '');
              setOtpCode(nextValue);
              clearNotice();
              if (errors.otp) {
                setFieldError('otp');
              }
            }}
            error={errors.otp}
            editable={!isSubmitting}
            keyboardType="numeric"
            maxLength={6}
            icon={
              <Ionicons
                name="key-outline"
                size={18}
                color={theme.colors.textSubtle}
              />
            }
          />

          <Button
            title="Verify OTP"
            onPress={handleOtpSubmit}
            loading={isSubmitting}
            fullWidth
            size="large"
          />

          <Button
            title="Resend OTP Code"
            onPress={handleEmailSubmit}
            variant="ghost"
            disabled={isSubmitting}
            fullWidth
            size="medium"
            style={styles.secondaryAction}
          />

          <Pressable
            onPress={() => {
              clearNotice();
              setFieldError('otp');
              setOtpCode('');
              setStage('email');
            }}
            disabled={isSubmitting}
            style={styles.textAction}
          >
            <Text style={styles.textActionLabel}>Use a different email</Text>
          </Pressable>
        </>
      );
    }

    if (stage === 'reset') {
      return (
        <>
          <Text style={styles.eyebrow}>Reset Password</Text>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>
            Set a strong password for your I-TRACK account to finish recovery.
          </Text>

          <Text style={styles.passwordHint}>
            {FormValidator.getPasswordRequirementsMessage()}
          </Text>

          {renderNotice()}

          <Input
            label="New password"
            placeholder="Enter new password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearNotice();
              if (errors.password) {
                setFieldError('password');
              }
            }}
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
            error={errors.password}
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

          <Input
            label="Confirm password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              clearNotice();
              if (errors.confirmPassword) {
                setFieldError('confirmPassword');
              }
            }}
            secureTextEntry={!showConfirmPassword}
            editable={!isSubmitting}
            error={errors.confirmPassword}
            icon={
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.colors.textSubtle}
              />
            }
            rightIcon={
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.colors.textSubtle}
              />
            }
            onRightIconPress={() =>
              setShowConfirmPassword((current) => !current)
            }
          />

          <Button
            title="Reset Password"
            onPress={handleResetSubmit}
            loading={isSubmitting}
            fullWidth
            size="large"
          />
        </>
      );
    }

    return (
      <>
        <View style={styles.successBadge}>
          <Ionicons
            name="checkmark-outline"
            size={30}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.eyebrow}>All Set</Text>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.subtitle}>
          {notice?.message ||
            'Your password has been reset successfully. You can sign in now with your new password.'}
        </Text>
        <Button
          title="Back to Sign In"
          onPress={() => router.replace('/(auth)/sign-in')}
          fullWidth
          size="large"
        />
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.backdrop} onPress={closeModal} />

      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.sheet}>
          <Pressable onPress={closeModal} style={styles.closeButton}>
            <Ionicons
              name="close-outline"
              size={22}
              color={theme.colors.text}
            />
          </Pressable>

          {stage !== 'success' ? (
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  styles.stepDotActive,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  (stage === 'otp' || stage === 'reset') && styles.stepDotActive,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  stage === 'reset' && styles.stepDotActive,
                ]}
              />
            </View>
          ) : null}

          {renderStepContent()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.46)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing['2xl'],
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.full,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.gray200,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  noticeCardInfo: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  noticeCardSuccess: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: theme.fonts.family.sans,
  },
  noticeTextInfo: {
    color: theme.colors.primaryDark,
  },
  noticeTextSuccess: {
    color: theme.colors.primaryDark,
  },
  secondaryAction: {
    marginTop: theme.spacing.sm,
  },
  textAction: {
    alignSelf: 'center',
    marginTop: theme.spacing.base,
    paddingVertical: theme.spacing.xs,
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: theme.fonts.family.sans,
  },
  successBadge: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.family.sans,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.fonts.family.sans,
  },
  passwordHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: theme.colors.textSubtle,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.fonts.family.sans,
  },
});
