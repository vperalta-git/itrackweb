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
  Select,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import {
  ALLOCATION_MANAGER_OPTIONS,
  findUnitAgentAllocationRecord,
  getSelectableAllocationUnits,
  getSalesAgentsForManager,
  loadUnitAgentAllocations,
  saveUnitAgentAllocation,
} from '@/src/mobile/data/unit-agent-allocation';

type FormErrors = {
  managerId?: string;
  salesAgentId?: string;
  unitId?: string;
};

type AllocationFormValues = {
  managerId: string | null;
  salesAgentId: string | null;
  unitId: string | null;
};

const DEFAULT_FORM_VALUES: AllocationFormValues = {
  managerId: null,
  salesAgentId: null,
  unitId: null,
};

export default function AllocationFormScreen() {
  const navigation = useNavigation();
  const { mode, allocationId } = useLocalSearchParams<{
    mode?: string | string[];
    allocationId?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedAllocationId = Array.isArray(allocationId)
    ? allocationId[0]
    : allocationId;
  const isEditMode = resolvedMode === 'edit';
  const allowImmediateDismissRef = useRef(false);
  const [editableAllocation, setEditableAllocation] = useState(() =>
    isEditMode && resolvedAllocationId
      ? findUnitAgentAllocationRecord(resolvedAllocationId)
      : null
  );
  const [optionsVersion, setOptionsVersion] = useState(0);
  const initialFormValues = useMemo<AllocationFormValues>(
    () => ({
      managerId: editableAllocation?.managerId ?? DEFAULT_FORM_VALUES.managerId,
      salesAgentId:
        editableAllocation?.salesAgentId ?? DEFAULT_FORM_VALUES.salesAgentId,
      unitId: editableAllocation?.unitId ?? DEFAULT_FORM_VALUES.unitId,
    }),
    [editableAllocation]
  );

  const [managerId, setManagerId] = useState<string | null>(null);
  const [salesAgentId, setSalesAgentId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isActive = true;
    const syncAllocationData = async () => {
      try {
        await loadUnitAgentAllocations();
      } catch {
        // Keep the latest cached records when refresh fails.
      }

      if (isActive) {
        setEditableAllocation(
          isEditMode && resolvedAllocationId
            ? findUnitAgentAllocationRecord(resolvedAllocationId)
            : null
        );
        setOptionsVersion((current) => current + 1);
      }
    };

    syncAllocationData().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncAllocationData().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isEditMode, navigation, resolvedAllocationId]);

  useEffect(() => {
    setManagerId(initialFormValues.managerId);
    setSalesAgentId(initialFormValues.salesAgentId);
    setUnitId(initialFormValues.unitId);
    setErrors({});
  }, [initialFormValues]);

  const salesAgentOptions = useMemo(
    () => getSalesAgentsForManager(managerId),
    [managerId, optionsVersion]
  );
  const selectableUnitOptions = useMemo(
    () =>
      getSelectableAllocationUnits(
        isEditMode ? editableAllocation?.unitId ?? unitId : unitId
      ),
    [editableAllocation?.unitId, isEditMode, optionsVersion, unitId]
  );
  const hasUnsavedChanges = useMemo(
    () =>
      managerId !== initialFormValues.managerId ||
      salesAgentId !== initialFormValues.salesAgentId ||
      unitId !== initialFormValues.unitId,
    [initialFormValues, managerId, salesAgentId, unitId]
  );

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard agent allocation?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add agent allocation screen?',
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

    if (!managerId) {
      nextErrors.managerId = 'Select a manager.';
    }

    if (!salesAgentId) {
      nextErrors.salesAgentId = 'Select a sales agent.';
    }

    if (!unitId) {
      nextErrors.unitId = 'Select a unit.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleManagerChange = (value: string | number) => {
    setManagerId(String(value));
    setSalesAgentId(null);
    setErrors((current) => ({
      ...current,
      managerId: undefined,
      salesAgentId: undefined,
    }));
  };

  const handleSalesAgentChange = (value: string | number) => {
    setSalesAgentId(String(value));
    setErrors((current) => ({
      ...current,
      salesAgentId: undefined,
    }));
  };

  const handleUnitChange = (value: string | number) => {
    setUnitId(String(value));
    setErrors((current) => ({
      ...current,
      unitId: undefined,
    }));
  };

  const handleSubmitAllocation = async () => {
    if (isEditMode && !editableAllocation) {
      Alert.alert(
        'Allocation not found',
        'The selected agent allocation could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedAllocation = await saveUnitAgentAllocation({
        id: editableAllocation?.id,
        managerId: String(managerId),
        salesAgentId: String(salesAgentId),
        unitId: String(unitId),
      });

      Alert.alert(
        isEditMode ? 'Agent Allocation Updated' : 'Agent Allocation Added',
        isEditMode
          ? `${savedAllocation.unitName} has been reassigned to ${savedAllocation.salesAgentName}.`
          : `${savedAllocation.unitName} has been assigned to ${savedAllocation.salesAgentName}.`,
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        isEditMode ? 'Unable to update allocation' : 'Unable to add allocation',
        error instanceof Error
          ? error.message
          : 'The agent allocation could not be saved right now.'
      );
    }
  };

  return (
    <StandaloneFormLayout
        title={isEditMode ? 'Edit Agent Allocation' : 'Add Agent Allocation'}
        subtitle={
          isEditMode
            ? 'Update the unit assignment for a sales agent'
            : 'Create a new unit assignment for a sales agent'
        }
        onBackPress={handleBackPress}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <Text style={styles.sectionSubtitle}>
            Choose the manager first, then select a sales agent under that
            manager.
          </Text>

          <Select
            label="Select Manager"
            placeholder="Select manager"
            value={managerId}
            options={ALLOCATION_MANAGER_OPTIONS}
            onValueChange={handleManagerChange}
            searchPlaceholder="Search manager"
            error={errors.managerId}
          />

          <Select
            label="Select Sales Agent"
            placeholder={
              managerId ? 'Select sales agent' : 'Select manager first'
            }
            value={salesAgentId}
            options={salesAgentOptions}
            onValueChange={handleSalesAgentChange}
            disabled={!managerId}
            searchPlaceholder="Search sales agent"
            error={errors.salesAgentId}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Unit Selection</Text>
          <Text style={styles.sectionSubtitle}>
            Pick the unit that will be assigned to the selected sales agent.
          </Text>

          <Select
            label="Select Unit"
            placeholder="Select unit"
            value={unitId}
            options={selectableUnitOptions}
            onValueChange={handleUnitChange}
            searchPlaceholder="Search unit"
            error={errors.unitId}
          />
        </Card>

        <View style={styles.actions}>
          <Button
            title={isEditMode ? 'Save Changes' : 'Add Agent Allocation'}
            onPress={handleSubmitAllocation}
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
