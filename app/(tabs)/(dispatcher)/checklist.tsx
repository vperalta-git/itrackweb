import React, { useEffect, useMemo, useState } from 'react';
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
  AppScreen,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  formatRequestedServices,
  getDispatcherChecklistProgress,
  getPendingDispatcherPreparations,
  getPreparationApprovalLabel,
  getPreparationBadgeStatus,
  getPreparationRecordRequesterLabel,
  getPreparationStatusLabel,
  PreparationRecord,
  toggleDispatcherChecklistStep,
} from '@/src/mobile/data/preparation';
import { PreparationStatus } from '@/src/mobile/types';

export default function ChecklistScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { preparationId } = useLocalSearchParams<{
    preparationId?: string | string[];
  }>();
  const requestedPreparationId = Array.isArray(preparationId)
    ? preparationId[0]
    : preparationId;
  const [preparations, setPreparations] = useState<PreparationRecord[]>(() =>
    getPendingDispatcherPreparations(user?.id)
  );
  const [selectedPreparationId, setSelectedPreparationId] = useState<
    string | null
  >(requestedPreparationId ?? null);

  useEffect(() => {
    const refreshPreparations = () => {
      setPreparations(getPendingDispatcherPreparations(user?.id));
    };

    refreshPreparations();

    const unsubscribe = navigation.addListener('focus', refreshPreparations);

    return unsubscribe;
  }, [navigation, user?.id]);

  useEffect(() => {
    if (requestedPreparationId) {
      setSelectedPreparationId(requestedPreparationId);
    }
  }, [requestedPreparationId]);

  useEffect(() => {
    if (!preparations.length) {
      setSelectedPreparationId(null);
      return;
    }

    if (
      requestedPreparationId &&
      preparations.some((item) => item.id === requestedPreparationId)
    ) {
      setSelectedPreparationId(requestedPreparationId);
      return;
    }

    if (
      selectedPreparationId &&
      preparations.some((item) => item.id === selectedPreparationId)
    ) {
      return;
    }

    setSelectedPreparationId(preparations[0].id);
  }, [preparations, requestedPreparationId, selectedPreparationId]);

  const selectedPreparation = useMemo(
    () =>
      preparations.find((item) => item.id === selectedPreparationId) ??
      preparations[0] ??
      null,
    [preparations, selectedPreparationId]
  );

  const progressPercent = selectedPreparation
    ? getDispatcherChecklistProgress(selectedPreparation)
    : 0;
  const completedCount = selectedPreparation
    ? selectedPreparation.dispatcherChecklist.filter((item) => item.completed)
        .length
    : 0;
  const checklistCount = selectedPreparation?.dispatcherChecklist.length ?? 0;
  const refreshPreparations = () => {
    setPreparations(getPendingDispatcherPreparations(user?.id));
  };

  const handleToggleTask = async (stepId: string) => {
    if (!selectedPreparation) {
      return;
    }

    try {
      const updatedPreparation = await toggleDispatcherChecklistStep(
        selectedPreparation.id,
        stepId
      );

      if (updatedPreparation.status === PreparationStatus.COMPLETED) {
        const remainingPreparations = getPendingDispatcherPreparations(user?.id);

        setPreparations(remainingPreparations);
        setSelectedPreparationId(remainingPreparations[0]?.id ?? null);

        Alert.alert(
          'Dispatcher Checklist Completed',
          `${selectedPreparation.unitName} has been marked as Completed and removed from the in-dispatch queue.`
        );
        return;
      }

      refreshPreparations();
    } catch (error) {
      Alert.alert(
        'Unable to update checklist',
        error instanceof Error
          ? error.message
          : 'The checklist step could not be updated right now.'
      );
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/(dispatcher)/dashboard' as any);
  };

  if (!selectedPreparation) {
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
        eyebrow="Dispatcher"
        title="Dispatcher Checklist"
        subtitle="Approved vehicle preparation endorsements will appear here once they move into the dispatch queue."
      />

      <EmptyState
        title="No in-dispatch checklist"
        description="Vehicle preparation requests approved by admin or supervisor will automatically appear here for the dispatcher."
      />
      </AppScreen>
    );
  }

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
        eyebrow="Dispatcher"
        title="Dispatcher Checklist"
        subtitle="Review the selected vehicle prep details and complete the dispatcher checks before release."
      />

      <Card style={styles.heroCard} variant="outlined">
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.vehicleTitle}>{selectedPreparation.unitName}</Text>
            <Text style={styles.vehicleSubtitle}>
              {selectedPreparation.variation}
            </Text>
          </View>

          <StatusBadge
            status={getPreparationBadgeStatus(selectedPreparation.status)}
            label={getPreparationStatusLabel(selectedPreparation.status)}
          />
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="car-sport-outline"
            size={14}
            color={theme.colors.textSubtle}
          />
          <Text style={styles.infoText}>
            Conduction No: {selectedPreparation.conductionNumber}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="person-outline"
            size={14}
            color={theme.colors.textSubtle}
          />
          <Text style={styles.infoText}>
            Submitted by {getPreparationRecordRequesterLabel(selectedPreparation)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={14}
            color={theme.colors.textSubtle}
          />
          <Text style={styles.infoText}>
            Approved by {getPreparationApprovalLabel(selectedPreparation)}
          </Text>
        </View>

        <View style={styles.serviceChip}>
          <Ionicons
            name="construct-outline"
            size={14}
            color={theme.colors.primaryDark}
          />
          <Text style={styles.serviceChipLabel}>Requested Services</Text>
          <Text style={styles.serviceChipValue}>
            {formatRequestedServices(
              selectedPreparation.requestedServices,
              selectedPreparation.customRequests
            )}
          </Text>
        </View>

        <ProgressBar
          progress={progressPercent}
          label={`Dispatcher Completion - ${completedCount}/${checklistCount} steps`}
          style={styles.progress}
        />
      </Card>

      <Card style={styles.detailCard}>
        <Text style={styles.sectionTitle}>Vehicle Prep Details</Text>

        <View style={styles.detailGrid}>
          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Conduction Number</Text>
            <Text style={styles.detailValue}>
              {selectedPreparation.conductionNumber}
            </Text>
          </View>

          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Body Color</Text>
            <Text style={styles.detailValue}>{selectedPreparation.bodyColor}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Customer</Text>
            <Text style={styles.detailValue}>{selectedPreparation.customerName}</Text>
          </View>

          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Contact Number</Text>
            <Text style={styles.detailValue}>
              {selectedPreparation.customerContactNo}
            </Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Date Created</Text>
            <Text style={styles.detailValue}>{selectedPreparation.createdAt}</Text>
          </View>

          <View style={styles.detailTile}>
            <Text style={styles.detailLabel}>Assigned Dispatcher</Text>
            <Text style={styles.detailValue}>
              {selectedPreparation.dispatcherName ?? 'Unassigned'}
            </Text>
          </View>
        </View>

        <View style={styles.notesBlock}>
          <Text style={styles.detailLabel}>Notes</Text>
          <Text style={styles.notesText}>
            {selectedPreparation.notes || 'No notes added.'}
          </Text>
        </View>
      </Card>

      <Card style={styles.listCard}>
        <Text style={styles.sectionTitle}>Checklist for Dispatcher</Text>

        {selectedPreparation.dispatcherChecklist.map((task, index) => (
          <TouchableOpacity
            key={task.id}
            style={[
              styles.taskRow,
              index < selectedPreparation.dispatcherChecklist.length - 1
                ? styles.rowDivider
                : null,
            ]}
            activeOpacity={0.85}
            onPress={() => handleToggleTask(task.id)}
          >
            <View
              style={[
                styles.checkCircle,
                task.completed && styles.checkCircleActive,
              ]}
            >
              {task.completed ? (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={theme.colors.white}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.taskLabel,
                task.completed && styles.taskLabelCompleted,
              ]}
            >
              {task.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Card>

    </AppScreen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  heroCard: {
    marginBottom: theme.spacing.base,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  heroCopy: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSubtle,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  serviceChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  serviceChipValue: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  progress: {
    marginTop: theme.spacing.base,
  },
  detailCard: {
    marginBottom: theme.spacing.base,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  detailTile: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  notesBlock: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  listCard: {
    marginBottom: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.family.sans,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  taskLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  taskLabelCompleted: {
    color: theme.colors.textSubtle,
    textDecorationLine: 'line-through',
  },
});
