import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  Button,
  Card,
  Input,
  Select,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import {
  formatUserRoleLabel,
  getAssignableManagerOptions,
  getUserManagementRecordById,
  isUserPhoneInUse,
  loadUserManagementRecords,
  saveUserManagementRecord,
  USER_ROLE_OPTIONS,
} from '@/src/mobile/data/users';
import { UserRole } from '@/src/mobile/types';
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/src/mobile/utils/phone';

type FormErrors = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  managerId?: string;
};

type UserFormValues = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  managerId: string | null;
};

const DEFAULT_FORM_VALUES: UserFormValues = {
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  role: UserRole.SALES_AGENT,
  managerId: null,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MANAGED_PASSWORD_TEXT = 'Credentials are emailed automatically';

export default function UserFormScreen() {
  const navigation = useNavigation();
  const { mode, userId } = useLocalSearchParams<{
    mode?: string | string[];
    userId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedUserId = Array.isArray(userId) ? userId[0] : userId;
  const isEditMode = resolvedMode === 'edit';
  const allowImmediateDismissRef = useRef(false);
  const [managerOptionsVersion, setManagerOptionsVersion] = useState(0);
  const [editableRecord, setEditableRecord] = useState(() =>
    isEditMode && resolvedUserId
      ? getUserManagementRecordById(resolvedUserId)
      : null
  );
  const initialFormValues = useMemo<UserFormValues>(
    () => ({
      email: editableRecord?.email ?? DEFAULT_FORM_VALUES.email,
      phone: editableRecord?.phone ?? DEFAULT_FORM_VALUES.phone,
      firstName: editableRecord?.firstName ?? DEFAULT_FORM_VALUES.firstName,
      lastName: editableRecord?.lastName ?? DEFAULT_FORM_VALUES.lastName,
      role: editableRecord?.role ?? DEFAULT_FORM_VALUES.role,
      managerId: editableRecord?.managerId ?? DEFAULT_FORM_VALUES.managerId,
    }),
    [editableRecord, isEditMode]
  );

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SALES_AGENT);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const managerOptions = useMemo(
    () =>
      getAssignableManagerOptions({
        includeManagerId: managerId ?? initialFormValues.managerId,
      }),
    [initialFormValues.managerId, managerId, managerOptionsVersion]
  );

  useEffect(() => {
    let isActive = true;
    const syncUserRecord = async () => {
      try {
        await loadUserManagementRecords();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setEditableRecord(
          isEditMode && resolvedUserId
            ? getUserManagementRecordById(resolvedUserId)
            : null
        );
        setManagerOptionsVersion((current) => current + 1);
      }
    };

    syncUserRecord().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncUserRecord().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedUserId]);

  useEffect(() => {
    setEmail(initialFormValues.email);
    setPhone(initialFormValues.phone);
    setFirstName(initialFormValues.firstName);
    setLastName(initialFormValues.lastName);
    setRole(initialFormValues.role);
    setManagerId(initialFormValues.managerId);
    setErrors({});
  }, [initialFormValues]);

  const hasUnsavedChanges = useMemo(
    () =>
      email !== initialFormValues.email ||
      phone !== initialFormValues.phone ||
      firstName !== initialFormValues.firstName ||
      lastName !== initialFormValues.lastName ||
      role !== initialFormValues.role ||
      managerId !== initialFormValues.managerId,
    [email, firstName, initialFormValues, lastName, managerId, phone, role]
  );

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard user entry?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add user screen?',
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
  }, [hasUnsavedChanges, isEditMode, navigation]);

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Enter the email address.';
    } else if (!EMAIL_PATTERN.test(email.trim().toLowerCase())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!phone) {
      nextErrors.phone = 'Enter the phone number.';
    } else if (!isValidMobilePhoneNumber(phone)) {
      nextErrors.phone = MOBILE_PHONE_VALIDATION_MESSAGE;
    } else if (isUserPhoneInUse(phone, editableRecord?.id)) {
      nextErrors.phone = 'Phone number already exists.';
    }

    if (!firstName.trim()) {
      nextErrors.firstName = 'Enter the first name.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Enter the last name.';
    }

    if (!role) {
      nextErrors.role = 'Select the user role.';
    }

    if (role === UserRole.SALES_AGENT) {
      if (!managerOptions.length) {
        nextErrors.managerId = 'Add a manager account first.';
      } else if (!managerId) {
        nextErrors.managerId = 'Select the assigned manager.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isEditMode && !editableRecord) {
      Alert.alert(
        'User not found',
        'The selected user record could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedRecord = await saveUserManagementRecord({
        id: editableRecord?.id,
        email,
        phone,
        firstName,
        lastName,
        role,
        managerId: role === UserRole.SALES_AGENT ? managerId : null,
        sendCredentialsEmail: !isEditMode,
      });
      const fullName = `${savedRecord.firstName} ${savedRecord.lastName}`;

      Alert.alert(
        isEditMode ? 'User Updated' : 'User Added',
        isEditMode
          ? `${fullName} has been updated as ${formatUserRoleLabel(savedRecord.role)}.`
          : `${fullName} has been added as ${formatUserRoleLabel(savedRecord.role)}. Login credentials were sent to ${savedRecord.email}.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Unable to save user',
        error instanceof Error
          ? error.message
          : 'Please review the user details and try again.'
      );
    }
  };

  return (
    <StandaloneFormLayout
        title={isEditMode ? 'Edit User' : 'Add User'}
        subtitle={
          isEditMode ? 'Update the user account' : 'Create a new user account'
        }
        onBackPress={handleBackPress}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.sectionSubtitle}>
            Fill in the user profile details exactly as they should appear in the
            account list.
          </Text>

          <Input
            label="Email"
          placeholder="Enter email address"
          value={email}
          onChangeText={(value) => {
            setEmail(value.trimStart());
            setErrors((current) => ({
                ...current,
                email: undefined,
              }));
            }}
            keyboardType="email-address"
            error={errors.email}
          />

          <Input
            label="Phone No"
            placeholder="Enter phone number"
            value={phone}
            onChangeText={(value) => {
              setPhone(normalizeMobilePhoneNumber(value));
              setErrors((current) => ({
                ...current,
                phone: undefined,
              }));
            }}
            keyboardType="phone-pad"
            maxLength={11}
            error={errors.phone}
          />
          <Text style={styles.helperText}>
            Phone numbers must be unique and must start with 09.
          </Text>

          <Input
            label="First Name"
            placeholder="Enter first name"
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              setErrors((current) => ({
                ...current,
                firstName: undefined,
              }));
            }}
            error={errors.firstName}
          />

          <Input
            label="Last Name"
            placeholder="Enter last name"
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setErrors((current) => ({
                ...current,
                lastName: undefined,
              }));
            }}
            error={errors.lastName}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Role and Access</Text>
          <Text style={styles.sectionSubtitle}>
            Assign the user role. For new accounts, a strong password will be
            generated automatically and emailed to the user.
          </Text>

          <Select
            label="Role"
            placeholder="Select user role"
            value={role}
            options={USER_ROLE_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            onValueChange={(value) => {
              const nextRole = value as UserRole;

              setRole(nextRole);
              if (nextRole !== UserRole.SALES_AGENT) {
                setManagerId(null);
              }
              setErrors((current) => ({
                ...current,
                role: undefined,
                managerId:
                  nextRole === UserRole.SALES_AGENT
                    ? current.managerId
                    : undefined,
              }));
            }}
            searchPlaceholder="Search user role"
            error={errors.role}
          />

          {role === UserRole.SALES_AGENT ? (
            <>
              <Select
                label="Assigned Manager"
                placeholder={
                  managerOptions.length
                    ? 'Select manager'
                    : 'No managers available'
                }
                value={managerId}
                options={managerOptions}
                onValueChange={(value) => {
                  setManagerId(String(value));
                  setErrors((current) => ({
                    ...current,
                    managerId: undefined,
                  }));
                }}
                searchPlaceholder="Search manager"
                error={errors.managerId}
                disabled={!managerOptions.length}
              />

              <Text style={styles.helperText}>
                Sales agents must be assigned to a specific manager.
              </Text>
            </>
          ) : null}

          <Input
            label={isEditMode ? 'Password' : 'Credential Delivery'}
            placeholder={MANAGED_PASSWORD_TEXT}
            value={isEditMode ? 'Managed separately' : MANAGED_PASSWORD_TEXT}
            onChangeText={() => {}}
            editable={false}
          />

          <Text style={styles.helperText}>
            {isEditMode
              ? 'Existing passwords are managed separately and are not shown here.'
              : 'The password is generated on the server and sent directly to the user email.'}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title={isEditMode ? 'Save Changes' : 'Add User'}
            onPress={handleSubmit}
            fullWidth
            icon={
              !isEditMode ? (
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={theme.colors.white}
                />
              ) : undefined
            }
            style={isEditMode ? styles.editSubmitButton : undefined}
          />
        </View>
    </StandaloneFormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing['2xl'],
  },
  card: {
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.borderStrong,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  helperText: {
    marginTop: -4,
    marginBottom: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
  },
  editSubmitButton: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});
