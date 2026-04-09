import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import {
  Button,
  Card,
  Input,
  StandaloneFormLayout,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import type { UnitSetupVariation } from '@/src/mobile/data/unit-setup';
import {
  findUnitSetupRecordByName,
  getUnitSetupRecords,
  normalizeUnitSetupValue,
  upsertUnitSetupRecord,
} from '@/src/mobile/data/unit-setup';

type VariationDraft = {
  id: string;
  name: string;
  transmission: string;
  drivetrain: string;
  bodyType: string;
  bodyColors: string[];
  colorInput: string;
};

type FormErrors = {
  unitName?: string;
  variations?: string;
};

const createVariationDraft = (
  variation?: Partial<UnitSetupVariation>
): VariationDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: variation?.name ?? '',
  transmission: variation?.transmission ?? '',
  drivetrain: variation?.drivetrain ?? '',
  bodyType: variation?.bodyType ?? '',
  bodyColors: [...(variation?.bodyColors ?? [])],
  colorInput: '',
});

const dedupeStrings = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeUnitSetupValue(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

export default function UnitSetupFormScreen() {
  const navigation = useNavigation();
  const allowImmediateDismissRef = useRef(false);
  const { mode, unitName: unitNameParam } = useLocalSearchParams<{
    mode?: string | string[];
    unitName?: string | string[];
  }>();
  const resolvedMode = Array.isArray(mode) ? mode[0] : mode;
  const resolvedUnitName = Array.isArray(unitNameParam)
    ? unitNameParam[0]
    : unitNameParam;
  const isEditMode = resolvedMode === 'edit';

  const [refreshing, setRefreshing] = useState(false);
  const [editableRecord, setEditableRecord] = useState(() =>
    isEditMode && resolvedUnitName
      ? findUnitSetupRecordByName(resolvedUnitName)
      : null
  );
  const [unitName, setUnitName] = useState('');
  const [variationDrafts, setVariationDrafts] = useState<VariationDraft[]>([
    createVariationDraft(),
  ]);
  const [errors, setErrors] = useState<FormErrors>({});

  const initialVariationDrafts = useMemo(
    () =>
      editableRecord?.variations?.length
        ? editableRecord.variations.map((variation) => createVariationDraft(variation))
        : [createVariationDraft()],
    [editableRecord]
  );

  const initialFormState = useMemo(
    () => ({
      unitName: editableRecord?.unitName ?? '',
      variations: initialVariationDrafts,
    }),
    [editableRecord, initialVariationDrafts]
  );

  useEffect(() => {
    setUnitName(initialFormState.unitName);
    setVariationDrafts(initialFormState.variations);
    setErrors({});
  }, [initialFormState]);

  useEffect(() => {
    const syncEditableRecord = () => {
      setEditableRecord(
        isEditMode && resolvedUnitName
          ? findUnitSetupRecordByName(resolvedUnitName)
          : null
      );
    };

    syncEditableRecord();
    const unsubscribe = navigation.addListener('focus', syncEditableRecord);

    return unsubscribe;
  }, [isEditMode, navigation, resolvedUnitName]);

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = JSON.stringify({
      unitName,
      variations: variationDrafts.map((variation) => ({
        name: variation.name,
        transmission: variation.transmission,
        drivetrain: variation.drivetrain,
        bodyType: variation.bodyType,
        bodyColors: variation.bodyColors,
      })),
    });
    const initialSnapshot = JSON.stringify({
      unitName: initialFormState.unitName,
      variations: initialFormState.variations.map((variation) => ({
        name: variation.name,
        transmission: variation.transmission,
        drivetrain: variation.drivetrain,
        bodyType: variation.bodyType,
        bodyColors: variation.bodyColors,
      })),
    });

    return currentSnapshot !== initialSnapshot;
  }, [initialFormState, unitName, variationDrafts]);

  const dismissWithoutConfirmation = () => {
    allowImmediateDismissRef.current = true;
    router.dismiss();
  };

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      isEditMode ? 'Discard changes?' : 'Discard unit setup?',
      isEditMode
        ? 'You have unsaved changes. Are you sure you want to leave this edit screen?'
        : 'You have unsaved changes. Are you sure you want to leave this add unit setup screen?',
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

  const handleRefresh = async () => {
    setRefreshing(true);
    setEditableRecord(
      isEditMode && resolvedUnitName
        ? findUnitSetupRecordByName(resolvedUnitName)
        : null
    );
    setRefreshing(false);
  };

  const updateVariationDraft = (
    variationId: string,
    updates: Partial<VariationDraft>
  ) => {
    setVariationDrafts((current) =>
      current.map((variation) =>
        variation.id === variationId ? { ...variation, ...updates } : variation
      )
    );
    setErrors((current) => ({
      ...current,
      variations: undefined,
    }));
  };

  const handleAddVariation = () => {
    setVariationDrafts((current) => [...current, createVariationDraft()]);
    setErrors((current) => ({
      ...current,
      variations: undefined,
    }));
  };

  const handleDeleteVariation = (variationId: string) => {
    if (variationDrafts.length === 1) {
      return;
    }

    setVariationDrafts((current) =>
      current.filter((variation) => variation.id !== variationId)
    );
  };

  const handleAddColors = (variationId: string) => {
    const variation = variationDrafts.find((item) => item.id === variationId);
    if (!variation) {
      return;
    }

    const candidates = dedupeStrings(
      variation.colorInput
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
    );

    if (!candidates.length) {
      return;
    }

    updateVariationDraft(variationId, {
      bodyColors: dedupeStrings([...variation.bodyColors, ...candidates]),
      colorInput: '',
    });
  };

  const handleRemoveColor = (variationId: string, bodyColor: string) => {
    const variation = variationDrafts.find((item) => item.id === variationId);
    if (!variation) {
      return;
    }

    updateVariationDraft(variationId, {
      bodyColors: variation.bodyColors.filter((item) => item !== bodyColor),
    });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const trimmedUnitName = unitName.trim();
    const normalizedUnitName = normalizeUnitSetupValue(trimmedUnitName);
    const hasDuplicateUnit = getUnitSetupRecords().some(
      (record) =>
        normalizeUnitSetupValue(record.unitName) === normalizedUnitName &&
        normalizeUnitSetupValue(record.unitName) !==
          normalizeUnitSetupValue(editableRecord?.unitName ?? '')
    );

    if (!trimmedUnitName) {
      nextErrors.unitName = 'Enter the unit name.';
    } else if (hasDuplicateUnit) {
      nextErrors.unitName = 'This unit name already exists.';
    }

    if (!variationDrafts.length) {
      nextErrors.variations = 'Add at least one variation.';
    } else {
      const seenVariationNames = new Set<string>();

      for (const variation of variationDrafts) {
        const trimmedVariationName = variation.name.trim();
        const normalizedVariationName =
          normalizeUnitSetupValue(trimmedVariationName);

        if (!trimmedVariationName) {
          nextErrors.variations = 'Every variation needs a variation name.';
          break;
        }

        if (seenVariationNames.has(normalizedVariationName)) {
          nextErrors.variations = 'Variation names must be unique per unit.';
          break;
        }

        seenVariationNames.add(normalizedVariationName);

        if (!variation.bodyColors.length) {
          nextErrors.variations = `Add at least one body color for ${trimmedVariationName}.`;
          break;
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isEditMode && !editableRecord) {
      Alert.alert(
        'Unit setup not found',
        'The selected unit setup record could not be loaded.'
      );
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      const savedRecords = upsertUnitSetupRecord(
        {
          unitName: unitName.trim(),
          variations: variationDrafts.map((variation) => ({
            name: variation.name.trim(),
            transmission: variation.transmission.trim(),
            drivetrain: variation.drivetrain.trim(),
            bodyType: variation.bodyType.trim(),
            bodyColors: variation.bodyColors,
          })),
        },
        editableRecord?.unitName
      );
      const savedRecord =
        savedRecords.find(
          (record) =>
            normalizeUnitSetupValue(record.unitName) ===
            normalizeUnitSetupValue(unitName)
        ) ?? null;

      Alert.alert(
        isEditMode ? 'Unit Setup Updated' : 'Unit Setup Added',
        savedRecord
          ? `${savedRecord.unitName} now has ${savedRecord.variations.length} saved variations.`
          : 'The unit setup has been saved.',
        [
          {
            text: 'OK',
            onPress: dismissWithoutConfirmation,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        isEditMode ? 'Unable to update unit setup' : 'Unable to add unit setup',
        error instanceof Error
          ? error.message
          : 'The unit setup could not be saved right now.'
      );
    }
  };

  return (
    <StandaloneFormLayout
      title={isEditMode ? 'Edit Unit Setup' : 'Add Unit Setup'}
      subtitle={
        isEditMode
          ? 'Update the real unit source used by Add Stock'
          : 'Create a unit source for Add Stock'
      }
      onBackPress={handleBackPress}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Unit Information</Text>
        <Text style={styles.sectionSubtitle}>
          Changes here update the Unit Name, Variation, and Body Color options used in Add Stock.
        </Text>

        <Input
          label="Unit Name"
          placeholder="Isuzu D-Max"
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
      </Card>

      <Card style={styles.card}>
        <View style={styles.variationHeader}>
          <View style={styles.variationCopy}>
            <Text style={styles.sectionTitle}>Variations</Text>
            <Text style={styles.sectionSubtitle}>
              Each variation has its own transmission, drivetrain, body type, and body colors.
            </Text>
          </View>
          <Button
            title="Add Variation"
            size="small"
            variant="outline"
            onPress={handleAddVariation}
            icon={
              <Ionicons
                name="add-outline"
                size={16}
                color={theme.colors.text}
              />
            }
          />
        </View>

        {errors.variations ? (
          <Text style={styles.errorText}>{errors.variations}</Text>
        ) : null}

        <View style={styles.variationList}>
          {variationDrafts.map((variation, index) => (
            <View key={variation.id} style={styles.variationCard}>
              <View style={styles.variationCardHeader}>
                <View style={styles.variationCardCopy}>
                  <Text style={styles.variationTitle}>Variation {index + 1}</Text>
                  <Text style={styles.variationSubtitle}>
                    Add the vehicle specs and colors for this variation only.
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={variationDrafts.length === 1}
                  onPress={() => handleDeleteVariation(variation.id)}
                  style={[
                    styles.iconButton,
                    variationDrafts.length === 1 && styles.iconButtonDisabled,
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={
                      variationDrafts.length === 1
                        ? theme.colors.textSubtle
                        : theme.colors.error
                    }
                  />
                </TouchableOpacity>
              </View>

              <Input
                label="Variation Name"
                placeholder="4x2 LS-A AT"
                value={variation.name}
                onChangeText={(value) =>
                  updateVariationDraft(variation.id, { name: value })
                }
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Input
                    label="Transmission"
                    placeholder="AT"
                    value={variation.transmission}
                    onChangeText={(value) =>
                      updateVariationDraft(variation.id, { transmission: value })
                    }
                  />
                </View>
                <View style={styles.rowItem}>
                  <Input
                    label="Drivetrain"
                    placeholder="4x2"
                    value={variation.drivetrain}
                    onChangeText={(value) =>
                      updateVariationDraft(variation.id, { drivetrain: value })
                    }
                  />
                </View>
              </View>

              <Input
                label="Body Type"
                placeholder="Pickup"
                value={variation.bodyType}
                onChangeText={(value) =>
                  updateVariationDraft(variation.id, { bodyType: value })
                }
              />

              <View style={styles.colorsSection}>
                <Text style={styles.colorsLabel}>Body Colors</Text>
                <Text style={styles.colorsHint}>
                  Add colors only for this variation.
                </Text>

                <View style={styles.colorInputRow}>
                  <View style={styles.colorInputField}>
                    <Input
                      placeholder="Splash White, Mercury Silver"
                      value={variation.colorInput}
                      onChangeText={(value) =>
                        updateVariationDraft(variation.id, { colorInput: value })
                      }
                    />
                  </View>
                  <Button
                    title="Add Color"
                    size="small"
                    variant="outline"
                    onPress={() => handleAddColors(variation.id)}
                  />
                </View>

                <View style={styles.colorWrap}>
                  {variation.bodyColors.map((bodyColor) => (
                    <View key={`${variation.id}-${bodyColor}`} style={styles.colorChip}>
                      <Text style={styles.colorChipText}>{bodyColor}</Text>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => handleRemoveColor(variation.id, bodyColor)}
                      >
                        <Ionicons
                          name="close-outline"
                          size={14}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title={isEditMode ? 'Save Unit Setup' : 'Add Unit Setup'}
          onPress={handleSubmit}
          fullWidth
          icon={
            !isEditMode ? (
              <Ionicons name="add-outline" size={18} color={theme.colors.white} />
            ) : undefined
          }
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
  variationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  variationCopy: {
    flex: 1,
  },
  errorText: {
    marginBottom: theme.spacing.base,
    fontSize: 12,
    color: theme.colors.error,
    fontFamily: theme.fonts.family.sans,
  },
  variationList: {
    gap: theme.spacing.base,
  },
  variationCard: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  variationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  variationCardCopy: {
    flex: 1,
  },
  variationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  variationSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  iconButtonDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  rowItem: {
    flex: 1,
  },
  colorsSection: {
    gap: theme.spacing.sm,
  },
  colorsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  colorsHint: {
    marginTop: -4,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  colorInputField: {
    flex: 1,
  },
  colorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  colorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
  },
});
