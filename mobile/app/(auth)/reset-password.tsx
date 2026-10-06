import React, { useState } from 'react';
import {
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
import FormValidator from '@/src/mobile/utils/validation';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const closeModal = () => {
    router.back();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!FormValidator.validatePassword(password)) {
      newErrors.password = FormValidator.getPasswordRequirementsMessage();
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
      router.replace('/(auth)/sign-in');
    }
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

          <Text style={styles.eyebrow}>Security Update</Text>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>
            Use a strong password to secure your I-TRACK account.
          </Text>
          <Text style={styles.passwordHint}>
            {FormValidator.getPasswordRequirementsMessage()}
          </Text>

          <Input
            label="New password"
            placeholder="Enter new password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
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
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
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
            onPress={handleReset}
            fullWidth
            size="large"
          />
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
    paddingVertical: theme.spacing.base,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.sm,
    backgroundColor: 'transparent',
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
