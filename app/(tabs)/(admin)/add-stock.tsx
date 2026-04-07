import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
import { VehicleStatus } from '@/src/mobile/types';
import {
  findVehicleStockById,
  formatVehicleStatusLabel,
  loadVehicleStocks,
  normalizeVehicleStockConductionNumber,
  saveVehicleStock,
  VEHICLE_STATUS_OPTIONS,
} from '@/src/mobile/data/vehicle-stocks';

type FormErrors = {
  unitName?: string;
  variation?: string;
  conductionNumber?: string;
  bodyColor?: string;
  status?: string;
};

type StockFormValues = {
  unitName: string;
  variation: string;
  conductionNumber: string;
  bodyColor: string;
  status: VehicleStatus;
  notes: string;
};

const DEFAULT_FORM_VALUES: StockFormValues = {
  unitName: '',
  variation: '',
  conductionNumber: '',
  bodyColor: '',
  status: VehicleStatus.AVAILABLE,
  notes: '',
};

export default function AddStockScreen() {
  const navigation = useNavigation();
  const { mode, vehicleId } = useLocalSearchParams<{
    mode?: string | string[];
    vehicleId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedVehicleId = Array.isArray(vehicleId) ? vehicleId[0] : vehicleId;
  const isEditMode = resolvedMode === 'edit';
  const allowImmediateDismissRef = useRef(false);
  const [editableStockRecord, setEditableStockRecord] = useState(() =>
    isEditMode && resolvedVehicleId
      ? findVehicleStockById(resolvedVehicleId)
      : null
  );
  const initialFormValues = useMemo<StockFormValues>(
    () => ({
      unitName: editableStockRecord?.unitName ?? DEFAULT_FORM_VALUES.unitName,
      variation: editableStockRecord?.variation ?? DEFAULT_FORM_VALUES.variation,
      conductionNumber:
        editableStockRecord?.conductionNumber ??
        DEFAULT_FORM_VALUES.conductionNumber,
      bodyColor: editableStockRecord?.bodyColor ?? DEFAULT_FORM_VALUES.bodyColor,
      status: editableStockRecord?.status ?? DEFAULT_FORM_VALUES.status,
      notes: editableStockRecord?.notes ?? DEFAULT_FORM_VALUES.notes,
    }),
    [editableStockRecord]
  );

  const [unitName, setUnitName] = useState('');
  const [variation, setVariation] = useState('');
  const [conductionNumber, setConductionNumber] = useState('');
  const [bodyColor, setBodyColor] = useState('');
  const [status, setStatus] = useState<VehicleStatus>(VehicleStatus.AVAILABLE);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isActive = true;
    const syncEditableStockRecord = async () => {
      if (!isEditMode) {
        if (isActive) {
          setEditableStockRecord(null);
        }
        return;
      }

      try {
        await loadVehicleStocks();
      } catch {
        // Keep the most recent cached value when the network refresh fails.
      }

      if (isActive) {
        setEditableStockRecord(
          resolvedVehicleId ? findVehicleStockById(resolvedVehicleId) : null
        );
      }
    };

    syncEditableStockRecord().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncEditableStockRecord().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedVehicleId]);

  useEffect(() => {
    setUnitName(initialFormValues.unitName);
    setVariation(initialFormValues.variation);
    setConductionNumber(initialFormValues.conductionNumber);
    setBodyColor(initialFormValues.bodyColor);
    setStatus(initialFormValues.status);
    setNotes(initialFormValues.notes);
    setErrors({});
  }, [initialFormValues]);

  const hasUnsavedChanges = useMemo(
    () =>
      unitName !== initialFormValues.unitName ||
      variation !== initialFormValues.variation ||
      conductionNumber !== initialFormValues.conductionNumber ||
      bodyColor !== initialFormValues.bodyColor ||
      status !== initialFormValues.status ||
      notes !== initialFormValues.notes,
    [
      bodyColor,
      conductionNumber,
      initialFormValues,
      notes,
      status,
      unitName,
      variation,
    ]
  );

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard stock entry?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add stock screen?',
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
    const cleanedConductionNumber = normalizeVehicleStockConductionNumber(
      conductionNumber
    );

    if (!unitName.trim()) {
      nextErrors.unitName = 'Enter the unit name.';
    }

    if (!variation.trim()) {
      nextErrors.variation = 'Enter the variation.';
    }

    if (!cleanedConductionNumber) {
      nextErrors.conductionNumber = 'Enter the conduction number.';
    } else if (
      cleanedConductionNumber.length < 6 ||
      cleanedConductionNumber.length > 7
    ) {
      nextErrors.conductionNumber = 'Conduction number must be 6 to 7 characters.';
    } else if (!/^[A-Z0-9]+$/.test(cleanedConductionNumber)) {
      nextErrors.conductionNumber = 'Use letters and numbers only.';
    }

    if (!bodyColor.trim()) {
      nextErrors.bodyColor = 'Enter the body color.';
    }

    if (!status) {
      nextErrors.status = 'Select the vehicle status.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitStock = async () => {
    if (isEditMode && !editableStockRecord) {
      Alert.alert(
        'Vehicle not found',
        'The selected stock record could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedVehicle = await saveVehicleStock({
        id: editableStockRecord?.id,
        unitName: unitName.trim(),
        variation: variation.trim(),
        conductionNumber,
        bodyColor,
        status,
        notes,
      });

      Alert.alert(
        isEditMode ? 'Stock Updated' : 'Stock Added',
        isEditMode
          ? `${savedVehicle.unitName} has been updated as ${formatVehicleStatusLabel(
              savedVehicle.status
            )}.`
          : `${savedVehicle.unitName} has been added to stock as ${formatVehicleStatusLabel(
              savedVehicle.status
            )}.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        isEditMode ? 'Unable to update stock' : 'Unable to add stock',
        error instanceof Error
          ? error.message
          : 'The stock record could not be saved right now.'
      );
    }
  };

  return (
    <StandaloneFormLayout
      title={isEditMode ? 'Edit Vehicle Stock' : 'Add Vehicle Stock'}
      subtitle={
        isEditMode ? 'Update the stock record' : 'Create a new stock record'
      }
      onBackPress={handleBackPress}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Text style={styles.sectionSubtitle}>
          Enter the unit details exactly as they should be saved in inventory.
        </Text>

        <Input
          label="Unit Name"
          placeholder="Enter unit name"
          value={unitName}
          onChangeText={(value) => {
            setUnitName(value);
            setErrors((current) => ({
              ...current,
              unitName: undefined,
            }));
          }}
          error={errors.unitName}
        />

        <Input
          label="Variation"
          placeholder="Enter variation"
          value={variation}
          onChangeText={(value) => {
            setVariation(value);
            setErrors((current) => ({
              ...current,
              variation: undefined,
            }));
          }}
          error={errors.variation}
        />

        <Input
          label="Conduction Number"
          placeholder="Enter conduction number"
          value={conductionNumber}
          onChangeText={(value) => {
            setConductionNumber(normalizeVehicleStockConductionNumber(value));
            setErrors((current) => ({
              ...current,
              conductionNumber: undefined,
            }));
          }}
          maxLength={7}
          error={errors.conductionNumber}
        />

        <Input
          label="Body Color"
          placeholder="Enter body color"
          value={bodyColor}
          onChangeText={(value) => {
            setBodyColor(value);
            setErrors((current) => ({
              ...current,
              bodyColor: undefined,
            }));
          }}
          error={errors.bodyColor}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Stock Settings</Text>
        <Text style={styles.sectionSubtitle}>
          Set the initial availability state and any supporting notes.
        </Text>

        <Select
          label="Status"
          placeholder="Select status"
          value={status}
          options={[...VEHICLE_STATUS_OPTIONS]}
          onValueChange={(value) => {
            setStatus(value as VehicleStatus);
            setErrors((current) => ({
              ...current,
              status: undefined,
            }));
          }}
          searchPlaceholder="Search status"
          error={errors.status}
        />

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
          title={isEditMode ? 'Save Changes' : 'Add Stock'}
          onPress={handleSubmitStock}
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
