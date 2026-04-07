import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import {
  AppScreen,
  Button,
  Card,
  Input,
  PageHeader,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import FormValidator from '@/src/mobile/utils/validation';

type PasswordErrors = {
  currentPassword?: string;
  nextPassword?: string;
  confirmPassword?: string;
};

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [saving, setSaving] = useState(false);
  const allowImmediateDismissRef = useRef(false);

  const hasUnsavedChanges =
    currentPassword.length > 0 ||
    nextPassword.length > 0 ||
    confirmPassword.length > 0;

  const clearError = (field: keyof PasswordErrors) => {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.back();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. Are you sure you want to leave this screen?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      dismissWithoutConfirmation();
      return;
    }

    confirmDiscardChanges(dismissWithoutConfirmation);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!hasUnsavedChanges || allowImmediateDismissRef.current) {
        return;
      }

      event.preventDefault();
      confirmDiscardChanges(() => {
        allowImmediateDismissRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation]);

  const validate = () => {
    const nextErrors: PasswordErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Current password is required.';
    }

    if (!nextPassword) {
      nextErrors.nextPassword = 'New password is required.';
    } else if (!FormValidator.validatePassword(nextPassword)) {
      nextErrors.nextPassword =
        FormValidator.getPasswordRequirementsMessage();
    } else if (nextPassword === currentPassword) {
      nextErrors.nextPassword =
        'New password must be different from the current password.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your new password.';
    } else if (confirmPassword !== nextPassword) {
      nextErrors.confirmPassword = 'The confirmation password does not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      await changePassword(currentPassword, nextPassword);
      Alert.alert(
        'Password Updated',
        'Your password was changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              allowImmediateDismissRef.current = true;
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Unable to Change Password',
        error instanceof Error
          ? error.message
          : 'Something went wrong while updating your password.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <PageHeader
        leading={
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={handleBackPress}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        }
        leadingPlacement="above"
        title="Change Password"
      />

      <Card style={styles.summaryCard} variant="elevated" padding="large">
        <View style={styles.summaryShell}>
          <View style={styles.summaryAccent} />

          <View style={styles.summaryContent}>
            <View style={styles.summaryTop}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={26}
                  color={theme.colors.primaryDark}
                />
              </View>

              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>Password Security</Text>
                <Text style={styles.summarySubtitle}>
                  Update your sign-in password.
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={theme.colors.primaryDark}
                />
                <Text style={styles.metaChipText}>Security update</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Password Details</Text>
        <Text style={styles.sectionCaption}>
          Use a strong password to protect your account access.
        </Text>
        <Text style={styles.sectionHint}>
          {FormValidator.getPasswordRequirementsMessage()}
        </Text>
      </View>

      <Card variant="elevated" padding="large" style={styles.formCard}>
        <Input
          label="Current Password"
          placeholder="Enter your current password"
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            if (errors.currentPassword) {
              clearError('currentPassword');
            }
          }}
          error={errors.currentPassword}
          secureTextEntry={!showCurrentPassword}
          icon={
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          rightIcon={
            <Ionicons
              name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          onRightIconPress={() =>
            setShowCurrentPassword((current) => !current)
          }
        />

        <Input
          label="New Password"
          placeholder="Enter a new password"
          value={nextPassword}
          onChangeText={(value) => {
            setNextPassword(value);
            if (errors.nextPassword) {
              clearError('nextPassword');
            }
          }}
          error={errors.nextPassword}
          secureTextEntry={!showNextPassword}
          icon={
            <Ionicons
              name="key-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          rightIcon={
            <Ionicons
              name={showNextPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          onRightIconPress={() => setShowNextPassword((current) => !current)}
        />

        <Input
          label="Confirm New Password"
          placeholder="Confirm the new password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword) {
              clearError('confirmPassword');
            }
          }}
          error={errors.confirmPassword}
          secureTextEntry={!showConfirmPassword}
          icon={
            <Ionicons
              name="checkmark-circle-outline"
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
          style={styles.lastInput}
        />

        <View style={styles.tipCard}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.primaryDark}
          />
          <Text style={styles.tipText}>
            Changes take effect on your next sign in.
          </Text>
        </View>

        <Button
          title="Update Password"
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="large"
        />
      </Card>
    </AppScreen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backButton: {
      width: 42,
      height: 42,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceOverlay,
    },
    summaryCard: {
      marginBottom: theme.spacing.xl,
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    summaryShell: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.base,
    },
    summaryAccent: {
      width: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    summaryContent: {
      flex: 1,
    },
    summaryTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.base,
      marginBottom: theme.spacing.base,
    },
    iconWrap: {
      width: 76,
      height: 76,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    summaryCopy: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
      fontFamily: theme.fonts.family.sans,
    },
    summarySubtitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.family.sans,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    sectionHeader: {
      marginBottom: theme.spacing.md,
      gap: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.family.sans,
    },
    sectionCaption: {
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.family.sans,
    },
    sectionHint: {
      fontSize: 12,
      lineHeight: 18,
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
    formCard: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    lastInput: {
      marginBottom: theme.spacing.sm,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.base,
      backgroundColor: theme.colors.primarySurface,
      borderWidth: 1,
      borderColor: theme.colors.primarySurfaceStrong,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
  });
