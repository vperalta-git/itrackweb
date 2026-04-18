import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import {
  Button,
  Card,
  Checkbox,
  Input,
  Select,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  PREPARATION_SERVICE_OPTIONS,
  PREPARATION_VEHICLE_OPTIONS,
  getPreparationRecordById,
  getPreparationStatusLabel,
  isPreparationEditable,
  loadPreparationRecords,
  savePreparationRecord,
} from '@/src/mobile/data/preparation';
import { PreparationStatus, ServiceType, UserRole } from '@/src/mobile/types';
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
  normalizeMobilePhoneNumber,
} from '@/src/mobile/utils/phone';

type FormErrors = {
  vehicleId?: string;
  requestedServices?: string;
  customRequests?: string;
  customerName?: string;
  customerContactNo?: string;
};

type PreparationFormValues = {
  vehicleId: string | number | null;
  requestedServices: ServiceType[];
  customRequests: string[];
  customerName: string;
  customerContactNo: string;
  notes: string;
};

const DEFAULT_FORM_VALUES: PreparationFormValues = {
  vehicleId: null,
  requestedServices: [],
  customRequests: [],
  customerName: '',
  customerContactNo: '',
  notes: '',
};

const areServicesEqual = (left: ServiceType[], right: ServiceType[]) =>
  [...left].sort().join('|') === [...right].sort().join('|');

const areCustomRequestsEqual = (left: string[], right: string[]) =>
  left.join('|') === right.join('|');

export default function PreparationFormScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { mode, preparationId } = useLocalSearchParams<{
    mode?: string | string[];
    preparationId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedPreparationId = Array.isArray(preparationId)
    ? preparationId[0]
    : preparationId;
  const isEditMode = resolvedMode === 'edit';
  const allowImmediateDismissRef = useRef(false);
  const lockedEditAlertShownRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editableRecord, setEditableRecord] = useState(() =>
    isEditMode && resolvedPreparationId
      ? getPreparationRecordById(resolvedPreparationId)
      : null
  );
  const [optionsVersion, setOptionsVersion] = useState(0);
  const initialFormValues = useMemo<PreparationFormValues>(
    () => ({
      vehicleId: editableRecord?.vehicleId ?? DEFAULT_FORM_VALUES.vehicleId,
      requestedServices:
        editableRecord?.requestedServices ?? DEFAULT_FORM_VALUES.requestedServices,
      customRequests:
        editableRecord?.customRequests ?? DEFAULT_FORM_VALUES.customRequests,
      customerName: editableRecord?.customerName ?? DEFAULT_FORM_VALUES.customerName,
      customerContactNo:
        editableRecord?.customerContactNo ?? DEFAULT_FORM_VALUES.customerContactNo,
      notes: editableRecord?.notes ?? DEFAULT_FORM_VALUES.notes,
    }),
    [editableRecord]
  );

  const [vehicleId, setVehicleId] = useState<string | number | null>(null);
  const [requestedServices, setRequestedServices] = useState<ServiceType[]>([]);
  const [customRequests, setCustomRequests] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContactNo, setCustomerContactNo] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isActive = true;
    const syncPreparationData = async () => {
      try {
        await loadPreparationRecords();
      } catch {
        // Keep the latest cached records when refresh fails.
      }

      if (isActive) {
        setEditableRecord(
          isEditMode && resolvedPreparationId
            ? getPreparationRecordById(resolvedPreparationId)
            : null
        );
        setOptionsVersion((current) => current + 1);
      }
    };

    syncPreparationData().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncPreparationData().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedPreparationId]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadPreparationRecords();
      setEditableRecord(
        isEditMode && resolvedPreparationId
          ? getPreparationRecordById(resolvedPreparationId)
          : null
      );
      setOptionsVersion((current) => current + 1);
    } catch (error) {
      setEditableRecord(
        isEditMode && resolvedPreparationId
          ? getPreparationRecordById(resolvedPreparationId)
          : null
      );
      setOptionsVersion((current) => current + 1);
      Alert.alert(
        'Unable to refresh preparation form',
        error instanceof Error
          ? error.message
          : 'The latest preparation details could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setVehicleId(initialFormValues.vehicleId);
    setRequestedServices(initialFormValues.requestedServices);
    setCustomRequests(initialFormValues.customRequests);
    setCustomerName(initialFormValues.customerName);
    setCustomerContactNo(initialFormValues.customerContactNo);
    setNotes(initialFormValues.notes);
    setErrors({});
  }, [initialFormValues]);

  const selectedVehicle = useMemo(
    () => PREPARATION_VEHICLE_OPTIONS.find((vehicle) => vehicle.id === vehicleId),
    [optionsVersion, vehicleId]
  );
  const selectedVehiclePreview = useMemo(
    () =>
      selectedVehicle ??
      (editableRecord && String(editableRecord.vehicleId) === String(vehicleId)
        ? {
            conductionNumber: editableRecord.conductionNumber,
            bodyColor: editableRecord.bodyColor,
          }
        : null),
    [editableRecord, selectedVehicle, vehicleId]
  );
  const hasCustomRequestService = requestedServices.includes(
    ServiceType.CUSTOM_REQUEST
  );
  const hasUnsavedChanges = useMemo(
    () =>
      vehicleId !== initialFormValues.vehicleId ||
      !areServicesEqual(requestedServices, initialFormValues.requestedServices) ||
      !areCustomRequestsEqual(customRequests, initialFormValues.customRequests) ||
      customerName !== initialFormValues.customerName ||
      customerContactNo !== initialFormValues.customerContactNo ||
      notes !== initialFormValues.notes,
    [
      customerContactNo,
      customerName,
      customRequests,
      initialFormValues,
      notes,
      requestedServices,
      vehicleId,
    ]
  );

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  useEffect(() => {
    if (
      !isEditMode ||
      !editableRecord ||
      isPreparationEditable(editableRecord.status) ||
      lockedEditAlertShownRef.current
    ) {
      return;
    }

    lockedEditAlertShownRef.current = true;
    Alert.alert(
      'Editing unavailable',
      `${getPreparationStatusLabel(
        editableRecord.status
      )} preparation records can no longer be edited.`,
      [
        {
          text: 'OK',
          onPress: dismissWithoutConfirmation,
        },
      ]
    );
  }, [editableRecord, isEditMode]);

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard preparation request?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add preparation screen?',
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

  const handleToggleService = (serviceValue: ServiceType) => {
    if (
      serviceValue === ServiceType.CUSTOM_REQUEST &&
      !requestedServices.includes(ServiceType.CUSTOM_REQUEST) &&
      customRequests.length === 0
    ) {
      setCustomRequests(['']);
    }

    setRequestedServices((current) => {
      if (current.includes(serviceValue)) {
        return current.filter((service) => service !== serviceValue);
      }

      return [...current, serviceValue];
    });
    setErrors((current) => ({
      ...current,
      requestedServices: undefined,
      customRequests:
        serviceValue === ServiceType.CUSTOM_REQUEST
          ? undefined
          : current.customRequests,
    }));
  };

  const handleAddCustomRequest = () => {
    setCustomRequests((current) => [...current, '']);
    setErrors((current) => ({
      ...current,
      customRequests: undefined,
    }));
  };

  const handleChangeCustomRequest = (index: number, value: string) => {
    setCustomRequests((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
    setErrors((current) => ({
      ...current,
      customRequests: undefined,
    }));
  };

  const handleRemoveCustomRequest = (index: number) => {
    setCustomRequests((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
    setErrors((current) => ({
      ...current,
      customRequests: undefined,
    }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!vehicleId) {
      nextErrors.vehicleId = 'Select an available vehicle from stock.';
    }

    if (!requestedServices.length) {
      nextErrors.requestedServices = 'Select at least one requested service.';
    }

    if (requestedServices.includes(ServiceType.CUSTOM_REQUEST)) {
      const filledCustomRequests = customRequests.filter((item) => item.trim());

      if (!filledCustomRequests.length) {
        nextErrors.customRequests = 'Add at least one custom request.';
      } else if (filledCustomRequests.length !== customRequests.length) {
        nextErrors.customRequests = 'Complete or remove the empty custom request fields.';
      }
    }

    if (!customerName.trim()) {
      nextErrors.customerName = 'Enter the customer name.';
    }

    if (!customerContactNo) {
      nextErrors.customerContactNo = 'Enter the customer contact number.';
    } else if (!isValidMobilePhoneNumber(customerContactNo)) {
      nextErrors.customerContactNo = MOBILE_PHONE_VALIDATION_MESSAGE;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isEditMode && !editableRecord) {
      Alert.alert(
        'Preparation not found',
        'The selected preparation record could not be loaded.'
      );
      return;
    }

    if (isEditMode && editableRecord && !isPreparationEditable(editableRecord.status)) {
      Alert.alert(
        'Editing unavailable',
        `${getPreparationStatusLabel(
          editableRecord.status
        )} preparation records can no longer be edited.`
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedRecord = await savePreparationRecord({
        id: editableRecord?.id,
        vehicleId: String(vehicleId),
        requestedByUserId: editableRecord ? undefined : user?.id,
        requestedServices,
        customRequests: requestedServices.includes(ServiceType.CUSTOM_REQUEST)
          ? customRequests.map((item) => item.trim()).filter(Boolean)
          : [],
        customerName: customerName.trim(),
        customerContactNo,
        notes,
        requestedByRole:
          editableRecord?.requestedByRole ?? user?.role ?? UserRole.ADMIN,
        requestedByName:
          editableRecord?.requestedByName ?? user?.name ?? 'System User',
        approvalStatus: editableRecord?.approvalStatus,
        approvedByRole: editableRecord?.approvedByRole,
        approvedByName: editableRecord?.approvedByName,
        approvedAt: editableRecord?.approvedAt,
        dispatcherId: editableRecord?.dispatcherId,
        dispatcherName: editableRecord?.dispatcherName,
        status: editableRecord?.status,
        progress: editableRecord?.progress,
      });

      Alert.alert(
        isEditMode ? 'Preparation Updated' : 'Preparation Added',
        isEditMode
          ? `${savedRecord.unitName} preparation has been updated and remains ${getPreparationStatusLabel(savedRecord.status).toLowerCase()}.`
          : savedRecord.status === PreparationStatus.PENDING
            ? `${savedRecord.unitName} preparation has been created and is now pending admin or supervisor approval.`
            : `${savedRecord.unitName} preparation has been created and moved to ${getPreparationStatusLabel(savedRecord.status)}.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        isEditMode ? 'Unable to update preparation' : 'Unable to add preparation',
        error instanceof Error
          ? error.message
          : 'The preparation request could not be saved right now.'
      );
    }
  };

  return (
    <StandaloneFormLayout
      title={isEditMode ? 'Edit Preparation' : 'Add Preparation'}
      subtitle={
        isEditMode
          ? 'Update the preparation request details'
          : 'Create a new vehicle preparation request'
      }
      onBackPress={handleBackPress}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Text style={styles.sectionSubtitle}>
          Select the vehicle and review the linked stock details before creating the request.
        </Text>

        <Select
          label="Select Vehicle"
          placeholder="Choose available vehicle"
          value={vehicleId}
          options={PREPARATION_VEHICLE_OPTIONS.map((vehicle) => ({
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
          searchPlaceholder="Search available vehicle"
          error={errors.vehicleId}
        />
        <Text style={styles.helperText}>
          Only vehicles currently marked `Available` in Vehicle Stocks are listed here.
        </Text>

        <Input
          label="Conduction Number"
          placeholder="Select vehicle first"
          value={selectedVehiclePreview?.conductionNumber ?? ''}
          onChangeText={() => {}}
          editable={false}
        />

        <Input
          label="Body Color"
          placeholder="Select vehicle first"
          value={selectedVehiclePreview?.bodyColor ?? ''}
          onChangeText={() => {}}
          editable={false}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Preparation Settings</Text>
        <Text style={styles.sectionSubtitle}>
          Select requested services and capture the customer details for SMS completion updates.
        </Text>

          <Text style={styles.fieldLabel}>Requested Services</Text>
          <View style={styles.serviceChecklist}>
            {PREPARATION_SERVICE_OPTIONS.map((service) => {
              const active = requestedServices.includes(service.value);
              const isLastService =
                service.value ===
                PREPARATION_SERVICE_OPTIONS[PREPARATION_SERVICE_OPTIONS.length - 1].value;

              return (
                <View
                  key={service.value}
                  style={[
                    styles.serviceRow,
                    active ? styles.serviceRowActive : null,
                    isLastService ? styles.serviceRowLast : null,
                  ]}
                >
                  <Checkbox
                    value={active}
                    onValueChange={() => handleToggleService(service.value)}
                    label={service.label}
                  />
                </View>
              );
            })}
          </View>

          {errors.requestedServices ? (
            <Text style={styles.errorText}>{errors.requestedServices}</Text>
          ) : null}

          {hasCustomRequestService ? (
            <View style={styles.customRequestSection}>
              <Text style={styles.fieldLabel}>Custom Request Items</Text>

              {customRequests.map((request, index) => (
                <Input
                  key={`custom-request-${index}`}
                  label={`Request ${index + 1}`}
                  placeholder="Enter custom request"
                  value={request}
                  onChangeText={(value) =>
                    handleChangeCustomRequest(index, value)
                  }
                  rightIcon={
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                  }
                  onRightIconPress={() => handleRemoveCustomRequest(index)}
                />
              ))}

              <TouchableOpacity
                style={styles.addCustomRequestButton}
                activeOpacity={0.86}
                onPress={handleAddCustomRequest}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.addCustomRequestText}>
                  Add More Request
                </Text>
              </TouchableOpacity>

              {errors.customRequests ? (
                <Text style={styles.errorText}>{errors.customRequests}</Text>
              ) : null}
            </View>
          ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <Text style={styles.sectionSubtitle}>
          Capture the customer contact so the app can send an SMS after preparation is completed.
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
            label="Customer Contact No"
            placeholder="Enter customer contact number"
            value={customerContactNo}
            onChangeText={(value) => {
              setCustomerContactNo(normalizeMobilePhoneNumber(value));
              setErrors((current) => ({
                ...current,
                customerContactNo: undefined,
              }));
            }}
            keyboardType="phone-pad"
            maxLength={11}
            error={errors.customerContactNo}
          />
          <Text style={styles.helperText}>
            Phone numbers must be unique and must start with 09.
          </Text>

          <Text style={styles.helperText}>
            Once preparation is completed, the customer will be notified through SMS.
          </Text>

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
          title={isEditMode ? 'Save Changes' : 'Add Prep'}
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
  fieldLabel: {
    marginBottom: theme.spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChecklist: {
    marginBottom: theme.spacing.base,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceOverlay,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  serviceRow: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  serviceRowActive: {
    backgroundColor: theme.colors.primarySurface,
  },
  serviceRowLast: {
    borderBottomWidth: 0,
  },
  customRequestSection: {
    marginTop: theme.spacing.xs,
  },
  addCustomRequestButton: {
    minHeight: 46,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  addCustomRequestText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
  helperText: {
    marginTop: -4,
    marginBottom: theme.spacing.base,
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
