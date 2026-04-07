import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
import {
  AppScreen,
  Button,
  Card,
  Input,
  PageHeader,
  UserAvatar,
} from '@/src/mobile/components';
import { AppTheme, useTheme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { isUserPhoneInUse } from '@/src/mobile/data/users';
import { getRoleLabel } from '@/src/mobile/navigation/access';
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/src/mobile/utils/phone';

type ProfileErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
};

const splitName = (name: string) => {
  const normalized = name.trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  const [firstName, ...rest] = normalized.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const buildAvatarDataUrl = (asset: ImagePicker.ImagePickerAsset) => {
  if (!asset.base64) {
    return null;
  }

  const mimeType =
    asset.mimeType && asset.mimeType.startsWith('image/')
      ? asset.mimeType
      : 'image/jpeg';

  return `data:${mimeType};base64,${asset.base64}`;
};

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, updateProfile } = useAuth();
  const initialName = useMemo(() => splitName(user?.name ?? ''), [user?.name]);
  const initialAvatar = user?.avatar ?? null;
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(normalizeMobilePhoneNumber(user?.phone ?? ''));
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [selectingImage, setSelectingImage] = useState(false);
  const allowImmediateDismissRef = useRef(false);

  const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  const hasUnsavedChanges =
    firstName.trim() !== initialName.firstName.trim() ||
    lastName.trim() !== initialName.lastName.trim() ||
    email.trim() !== (user?.email ?? '').trim() ||
    normalizeMobilePhoneNumber(phone) !==
      normalizeMobilePhoneNumber(user?.phone ?? '') ||
    bio.trim() !== (user?.bio ?? '').trim() ||
    (avatar ?? '') !== (initialAvatar ?? '');

  const clearError = (field: keyof ProfileErrors) => {
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
    const nextErrors: ProfileErrors = {};
    const normalizedEmail = email.trim();
    const normalizedPhone = normalizeMobilePhoneNumber(phone);

    if (!firstName.trim()) {
      nextErrors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Last name is required.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!normalizedPhone) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidMobilePhoneNumber(normalizedPhone)) {
      nextErrors.phone = MOBILE_PHONE_VALIDATION_MESSAGE;
    } else if (isUserPhoneInUse(normalizedPhone, user?.id)) {
      nextErrors.phone = 'Phone number already exists.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSelectImage = async () => {
    try {
      setSelectingImage(true);
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Allow photo library access to choose a profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const nextAvatar = buildAvatarDataUrl(result.assets[0]);

      if (!nextAvatar) {
        Alert.alert(
          'Unable to use image',
          'The selected image could not be prepared. Please try a different photo.'
        );
        return;
      }

      setAvatar(nextAvatar);
    } catch (error) {
      Alert.alert(
        'Unable to open gallery',
        error instanceof Error
          ? error.message
          : 'The image picker could not be opened right now.'
      );
    } finally {
      setSelectingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setAvatar(null);
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email,
        phone: normalizeMobilePhoneNumber(phone),
        bio,
        avatar,
      });
      Alert.alert('Profile Updated', 'Your profile details were saved successfully.', [
        {
          text: 'OK',
          onPress: () => {
            allowImmediateDismissRef.current = true;
            router.back();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Unable to Save',
        error instanceof Error
          ? error.message
          : 'Something went wrong while updating your profile.'
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
        title="Edit Profile"
      />

      <Card style={styles.summaryCard} variant="elevated" padding="large">
        <View style={styles.summaryShell}>
          <View style={styles.summaryAccent} />

          <View style={styles.summaryContent}>
            <View style={styles.summaryTop}>
              <UserAvatar
                name={displayName || 'Workspace User'}
                avatarUri={avatar}
                size={76}
                radius={24}
                textSize={26}
              />

              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>
                  {displayName || 'Workspace User'}
                </Text>
                <Text style={styles.summarySubtitle}>
                  {user ? getRoleLabel(user.role) : 'Workspace User'}
                </Text>
              </View>
            </View>

            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={styles.avatarActionButton}
                activeOpacity={0.86}
                onPress={handleSelectImage}
                disabled={selectingImage || saving}
              >
                <Ionicons
                  name="image-outline"
                  size={16}
                  color={theme.colors.primaryDark}
                />
                <Text style={styles.avatarActionButtonText}>
                  {selectingImage ? 'Opening Gallery...' : 'Change Photo'}
                </Text>
              </TouchableOpacity>

              {avatar ? (
                <TouchableOpacity
                  style={[
                    styles.avatarActionButton,
                    styles.avatarActionButtonSecondary,
                  ]}
                  activeOpacity={0.86}
                  onPress={handleRemoveImage}
                  disabled={saving}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[
                      styles.avatarActionButtonText,
                      styles.avatarActionButtonTextSecondary,
                    ]}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={theme.colors.primaryDark}
                />
                <Text style={styles.metaChipText}>Personal details</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.sectionCaption}>
          Keep your account details accurate and up to date.
        </Text>
      </View>

      <Card variant="elevated" padding="large" style={styles.formCard}>
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Input
              label="First Name"
              placeholder="Enter first name"
              value={firstName}
              onChangeText={(value) => {
                setFirstName(value);
                if (errors.firstName) {
                  clearError('firstName');
                }
              }}
              error={errors.firstName}
              icon={
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={theme.colors.textSubtle}
                />
              }
            />
          </View>

          <View style={styles.nameField}>
            <Input
              label="Last Name"
              placeholder="Enter last name"
              value={lastName}
              onChangeText={(value) => {
                setLastName(value);
                if (errors.lastName) {
                  clearError('lastName');
                }
              }}
              error={errors.lastName}
              icon={
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={theme.colors.textSubtle}
                />
              }
            />
          </View>
        </View>

        <Input
          label="Email"
          placeholder="Enter your email address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) {
              clearError('email');
            }
          }}
          error={errors.email}
          keyboardType="email-address"
          icon={
            <Ionicons
              name="mail-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
        />

        <Input
          label="Phone Number"
          placeholder="09XXXXXXXXX"
          value={phone}
          onChangeText={(value) => {
            setPhone(normalizeMobilePhoneNumber(value));
            if (errors.phone) {
              clearError('phone');
            }
          }}
          error={errors.phone}
          keyboardType="phone-pad"
          maxLength={11}
          icon={
            <Ionicons
              name="call-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          }
          style={styles.phoneInput}
        />
        <Text style={styles.phoneHint}>
          Phone numbers must be unique and must start with 09.
        </Text>

        <Input
          label="Bio"
          placeholder="Tell people a little about your role and responsibilities"
          value={bio}
          onChangeText={(value) => {
            setBio(value);
            if (errors.bio) {
              clearError('bio');
            }
          }}
          error={errors.bio}
          multiline
          numberOfLines={4}
        />

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!hasUnsavedChanges || saving}
          fullWidth
          size="large"
          style={styles.saveButton}
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
    avatarActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.base,
    },
    avatarActionButton: {
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
    avatarActionButtonSecondary: {
      backgroundColor: theme.colors.errorLight,
      borderColor: '#F8D0D0',
    },
    avatarActionButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primaryDark,
      fontFamily: theme.fonts.family.sans,
    },
    avatarActionButtonTextSecondary: {
      color: theme.colors.error,
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
    formCard: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    nameField: {
      flex: 1,
    },
    phoneInput: {
      marginBottom: 0,
    },
    phoneHint: {
      marginBottom: theme.spacing.base,
      fontSize: 12,
      lineHeight: 18,
      color: theme.colors.textSubtle,
      fontFamily: theme.fonts.family.sans,
    },
    saveButton: {
      marginTop: theme.spacing.xs,
    },
  });
