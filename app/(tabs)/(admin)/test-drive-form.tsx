import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import DatePicker from 'react-native-date-picker';
import {
  Button,
  Card,
  Input,
  Select,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  canScheduleVehicleForTestDrive,
  canManageTestDriveStatusForRole,
  findTestDriveVehicleById,
  formatTestDriveSchedule,
  formatTestDriveStatusLabel,
  getDefaultTestDriveStatusForRole,
  getEligibleTestDriveVehicleSummary,
  getEligibleTestDriveVehicles,
  getTestDriveBookingById,
  isTestDriveCustomerPhoneInUse,
  loadTestDriveBookings,
  saveTestDriveBooking,
  TEST_DRIVE_STATUS_OPTIONS,
} from '@/src/mobile/data/test-drive';
import { TestDriveStatus, UserRole } from '@/src/mobile/types';
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/src/mobile/utils/phone';

type FormErrors = {
  customerName?: string;
  customerPhone?: string;
  vehicleId?: string;
  scheduledAt?: string;
  status?: string;
};

type TestDriveFormValues = {
  customerName: string;
  customerPhone: string;
  vehicleId: string | number | null;
  scheduledDate: string;
  scheduledTime: string | number | null;
  status: TestDriveStatus;
  notes: string;
};

const DEFAULT_FORM_VALUES: TestDriveFormValues = {
  customerName: '',
  customerPhone: '',
  vehicleId: null,
  scheduledDate: '',
  scheduledTime: null,
  status: TestDriveStatus.PENDING,
  notes: '',
};

const DATE_STORAGE_FORMAT = 'yyyy-MM-dd';
const TIME_STORAGE_FORMAT = 'hh:mm aa';
const DATE_TIME_STORAGE_FORMAT = 'yyyy-MM-dd hh:mm aa';

const getDefaultScheduleDateTime = () => {
  const nextDate = new Date();

  nextDate.setSeconds(0, 0);

  const minutes = nextDate.getMinutes();

  if (minutes === 0 || minutes === 30) {
    return nextDate;
  }

  if (minutes < 30) {
    nextDate.setMinutes(30, 0, 0);
    return nextDate;
  }

  nextDate.setHours(nextDate.getHours() + 1, 0, 0, 0);
  return nextDate;
};

export default function TestDriveFormScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const canManageBookingStatus = canManageTestDriveStatusForRole(role);
  const defaultCreateStatus = getDefaultTestDriveStatusForRole(role);
  const { mode, bookingId } = useLocalSearchParams<{
    mode?: string | string[];
    bookingId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const isEditMode = resolvedMode === 'edit';
  const canEditBookingStatus = isEditMode && canManageBookingStatus;
  const allowImmediateDismissRef = useRef(false);
  const [editableRecord, setEditableRecord] = useState(() =>
    isEditMode && resolvedBookingId
      ? getTestDriveBookingById(resolvedBookingId)
      : null
  );
  const [optionsVersion, setOptionsVersion] = useState(0);
  const initialFormValues = useMemo<TestDriveFormValues>(
    () => ({
      customerName:
        editableRecord?.customerName ?? DEFAULT_FORM_VALUES.customerName,
      customerPhone:
        editableRecord?.customerPhone ?? DEFAULT_FORM_VALUES.customerPhone,
      vehicleId: editableRecord?.vehicleId ?? DEFAULT_FORM_VALUES.vehicleId,
      scheduledDate:
        editableRecord?.scheduledDate ?? DEFAULT_FORM_VALUES.scheduledDate,
      scheduledTime:
        editableRecord?.scheduledTime ?? DEFAULT_FORM_VALUES.scheduledTime,
      status: editableRecord?.status ?? defaultCreateStatus,
      notes: editableRecord?.notes ?? DEFAULT_FORM_VALUES.notes,
    }),
    [defaultCreateStatus, editableRecord]
  );
  const eligibilitySummary = useMemo(
    () => getEligibleTestDriveVehicleSummary(),
    [optionsVersion]
  );

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleId, setVehicleId] = useState<string | number | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<TestDriveStatus>(defaultCreateStatus);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isActive = true;
    const syncTestDriveData = async () => {
      try {
        await loadTestDriveBookings();
      } catch {
        // Keep the latest cached records when refresh fails.
      }

      if (isActive) {
        setEditableRecord(
          isEditMode && resolvedBookingId
            ? getTestDriveBookingById(resolvedBookingId)
            : null
        );
        setOptionsVersion((current) => current + 1);
      }
    };

    syncTestDriveData().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncTestDriveData().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedBookingId]);

  useEffect(() => {
    setCustomerName(initialFormValues.customerName);
    setCustomerPhone(initialFormValues.customerPhone);
    setVehicleId(initialFormValues.vehicleId);
    setScheduledDate(initialFormValues.scheduledDate);
    setScheduledTime(initialFormValues.scheduledTime);
    setStatus(initialFormValues.status);
    setNotes(initialFormValues.notes);
    setErrors({});
  }, [initialFormValues]);

  const eligibleVehicles = useMemo(
    () => getEligibleTestDriveVehicles((vehicleId as string | null) ?? null),
    [optionsVersion, vehicleId]
  );
  const selectedVehicle = useMemo(
    () => findTestDriveVehicleById((vehicleId as string | null) ?? null),
    [optionsVersion, vehicleId]
  );
  const scheduledAt = useMemo(() => {
    if (!scheduledDate || !scheduledTime) {
      return null;
    }

    const parsedValue = parse(
      `${scheduledDate} ${String(scheduledTime)}`,
      DATE_TIME_STORAGE_FORMAT,
      new Date()
    );

    return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
  }, [scheduledDate, scheduledTime]);
  const hasUnsavedChanges = useMemo(
    () =>
      customerName !== initialFormValues.customerName ||
      customerPhone !== initialFormValues.customerPhone ||
      vehicleId !== initialFormValues.vehicleId ||
      scheduledDate !== initialFormValues.scheduledDate ||
      scheduledTime !== initialFormValues.scheduledTime ||
      status !== initialFormValues.status ||
      notes !== initialFormValues.notes,
    [
      customerName,
      customerPhone,
      initialFormValues,
      notes,
      scheduledDate,
      scheduledTime,
      status,
      vehicleId,
    ]
  );

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard test drive booking?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add booking screen?',
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
    const selectedVehicleId = vehicleId ? String(vehicleId) : '';
    const isKeepingCurrentVehicle = editableRecord?.vehicleId === selectedVehicleId;
    const isVehicleEligible =
      isKeepingCurrentVehicle || canScheduleVehicleForTestDrive(selectedVehicleId);

    if (!customerName.trim()) {
      nextErrors.customerName = 'Enter the customer name.';
    }

    if (!customerPhone) {
      nextErrors.customerPhone = 'Enter the phone number.';
    } else if (!isValidMobilePhoneNumber(customerPhone)) {
      nextErrors.customerPhone = MOBILE_PHONE_VALIDATION_MESSAGE;
    } else if (
      isTestDriveCustomerPhoneInUse(customerPhone, editableRecord?.id)
    ) {
      nextErrors.customerPhone = 'Customer phone number already exists.';
    }

    if (!selectedVehicleId) {
      nextErrors.vehicleId = 'Select an eligible vehicle for the test drive.';
    } else if (!isVehicleEligible) {
      nextErrors.vehicleId =
        'Only available units that are not assigned to an agent can be scheduled.';
    }

    if (!scheduledAt) {
      nextErrors.scheduledAt = 'Select the test drive date and time.';
    }

    if (!status) {
      nextErrors.status = 'Select the booking status.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmDateTime = (value: Date) => {
    setDateTimePickerOpen(false);
    setScheduledDate(format(value, DATE_STORAGE_FORMAT));
    setScheduledTime(format(value, TIME_STORAGE_FORMAT));
    setErrors((current) => ({
      ...current,
      scheduledAt: undefined,
    }));
  };

  const handleSubmit = async () => {
    if (isEditMode && !editableRecord) {
      Alert.alert(
        'Booking not found',
        'The selected test drive booking could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedBooking = await saveTestDriveBooking({
        id: editableRecord?.id,
        vehicleId: String(vehicleId),
        requestedByUserId: editableRecord ? undefined : user?.id,
        customerName: customerName.trim(),
        customerPhone,
        scheduledDate,
        scheduledTime: String(scheduledTime),
        notes: notes.trim(),
        status,
      });

      Alert.alert(
        isEditMode ? 'Booking Updated' : 'Booking Added',
        isEditMode
          ? `${savedBooking.unitName} is now booked for ${savedBooking.customerName}. Status: ${formatTestDriveStatusLabel(savedBooking.status)}.`
          : canManageBookingStatus
            ? `${savedBooking.unitName} has been added for ${savedBooking.customerName} and is automatically Approved.`
            : `${savedBooking.unitName} has been added for ${savedBooking.customerName} with Pending status for Admin or Supervisor approval.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Unable to save booking',
        error instanceof Error
          ? error.message
          : 'Please review the booking details and try again.'
      );
    }
  };

  return (
    <StandaloneFormLayout
        title={isEditMode ? 'Edit Test Drive' : 'Add Test Drive'}
        subtitle={
          isEditMode
            ? 'Update the customer booking details'
            : 'Create a new test drive booking'
        }
        onBackPress={handleBackPress}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <Text style={styles.sectionSubtitle}>
            Capture the customer information first, then assign an eligible stock
            unit for the scheduled drive.
          </Text>

          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            value={customerName}
            onChangeText={(value) => {
              setCustomerName(value);
              setErrors((current) => ({
                ...current,
                customerName: undefined,
              }));
            }}
            error={errors.customerName}
          />

          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            value={customerPhone}
            onChangeText={(value) => {
              setCustomerPhone(normalizeMobilePhoneNumber(value));
              setErrors((current) => ({
                ...current,
                customerPhone: undefined,
              }));
            }}
            keyboardType="phone-pad"
            maxLength={11}
            error={errors.customerPhone}
          />
          <Text style={styles.helperText}>
            Phone numbers must be unique and must start with 09.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Selection</Text>
          <Text style={styles.sectionSubtitle}>
            Only units with `Available` stock status that are not assigned to an
            agent can be used for test drive bookings.
          </Text>

          <Select
            label="Select Vehicle"
            placeholder="Choose eligible vehicle stock"
            value={vehicleId}
            options={eligibleVehicles.map((vehicle) => ({
              label: `${vehicle.unitName} - ${vehicle.variation}`,
              value: vehicle.id,
            }))}
            onValueChange={(value) => {
              setVehicleId(value);
              setErrors((current) => ({
                ...current,
                vehicleId: undefined,
              }));
            }}
            searchPlaceholder="Search eligible vehicle stock"
            error={errors.vehicleId}
          />

          <Text style={styles.helperText}>
            {eligibleVehicles.length
              ? `${eligibilitySummary.eligible} of ${eligibilitySummary.total} stock units are currently eligible for test drives.`
              : 'No eligible vehicle stocks are currently available for test drive scheduling.'}
          </Text>

          <Input
            label="Conduction Number"
            placeholder="Select vehicle first"
            value={selectedVehicle?.conductionNumber ?? ''}
            onChangeText={() => {}}
            editable={false}
          />

          <Input
            label="Body Color"
            placeholder="Select vehicle first"
            value={selectedVehicle?.bodyColor ?? ''}
            onChangeText={() => {}}
            editable={false}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Date and Time</Text>
          <Text style={styles.sectionSubtitle}>
            Set the schedule in one combined date-time selector, then add notes
            the sales team should review before the customer arrives.
          </Text>

          <Text style={styles.fieldLabel}>Date and Time</Text>

          <TouchableOpacity
            style={[
              styles.dateTimeField,
              errors.scheduledAt ? styles.dateTimeFieldError : null,
            ]}
            activeOpacity={0.86}
            onPress={() => setDateTimePickerOpen(true)}
          >
            <View style={styles.dateTimeFieldContent}>
              <View style={styles.dateTimeIconWrap}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>

              <View style={styles.dateTimeCopy}>
                <Text style={styles.dateTimeLabel}>Schedule Slot</Text>
                <Text
                  style={[
                    styles.dateTimeValue,
                    !scheduledAt ? styles.dateTimeValuePlaceholder : null,
                  ]}
                >
                  {scheduledAt
                    ? formatTestDriveSchedule(
                        scheduledDate,
                        String(scheduledTime)
                      )
                    : 'Select date and time'}
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={theme.colors.textSubtle}
            />
          </TouchableOpacity>

          {errors.scheduledAt ? (
            <Text style={styles.errorText}>{errors.scheduledAt}</Text>
          ) : null}

          {scheduledAt ? (
            <Text style={styles.helperText}>
              {`Selected slot: ${formatTestDriveSchedule(
                scheduledDate,
                String(scheduledTime)
              )}`}
            </Text>
          ) : null}

          {canEditBookingStatus ? (
            <Select
              label="Status"
              placeholder="Select booking status"
              value={status}
              options={TEST_DRIVE_STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              onValueChange={(value) => {
                setStatus(value as TestDriveStatus);
                setErrors((current) => ({
                  ...current,
                  status: undefined,
                }));
              }}
              searchPlaceholder="Search booking status"
              error={errors.status}
            />
          ) : (
            <Input
              label="Status"
              placeholder="Booking status"
              value={formatTestDriveStatusLabel(status)}
              onChangeText={() => {}}
              editable={false}
            />
          )}

          {!canEditBookingStatus ? (
            <Text style={styles.helperText}>
              {canManageBookingStatus
                ? 'Schedules created by Admin and Supervisor accounts are automatically saved as Approved.'
                : isEditMode
                  ? 'Only Admin and Supervisor can approve, cancel, mark no-show, or complete this booking.'
                  : 'Schedules created by Manager and Agent accounts are automatically saved as Pending until Admin or Supervisor approval.'}
            </Text>
          ) : null}

          <Input
            label="Notes"
            placeholder="Add notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </Card>

        <View style={styles.actions}>
          <Button
            title={isEditMode ? 'Save Changes' : 'Add Booking'}
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
        <DatePicker
          modal
          open={dateTimePickerOpen}
          date={scheduledAt ?? getDefaultScheduleDateTime()}
          mode="datetime"
          minuteInterval={30}
          onConfirm={handleConfirmDateTime}
          onCancel={() => setDateTimePickerOpen(false)}
        />
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
  fieldLabel: {
    marginBottom: theme.spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  dateTimeField: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceOverlay,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    ...theme.shadows.sm,
  },
  dateTimeFieldError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.surface,
  },
  dateTimeFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateTimeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  dateTimeCopy: {
    flex: 1,
  },
  dateTimeLabel: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  dateTimeValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  dateTimeValuePlaceholder: {
    color: theme.colors.textSubtle,
  },
  helperText: {
    marginTop: -4,
    marginBottom: theme.spacing.lg,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    color: theme.colors.error,
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
