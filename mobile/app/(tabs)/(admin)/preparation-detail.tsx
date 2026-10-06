import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import {
  AccessScopeNotice,
  Card,
  Header,
  ProgressBar,
  StatusBadge,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  approvePreparationRequest,
  confirmPreparationReadyForRelease,
  deletePreparationRecord,
  formatRequestedServices,
  getPreparationApprovalLabel,
  getPreparationBadgeStatus,
  getPreparationRecordById,
  getPreparationRecordRequesterLabel,
  getPreparationStatusLabel,
  isPreparationEditable,
  loadPreparationRecords,
  markPreparationCompleted,
  rejectPreparationRequest,
} from '@/src/mobile/data/preparation';
import {
  getModuleAccess,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { PreparationStatus, UserRole } from '@/src/mobile/types';

export default function PreparationDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { preparationId } = useLocalSearchParams<{
    preparationId?: string | string[];
  }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'vehiclePreparation');
  const resolvedPreparationId = Array.isArray(preparationId)
    ? preparationId[0]
    : preparationId;
  const [refreshing, setRefreshing] = useState(false);
  const [record, setRecord] = useState(() =>
    resolvedPreparationId ? getPreparationRecordById(resolvedPreparationId) : null
  );

  useEffect(() => {
    let isActive = true;
    const refreshRecord = async () => {
      try {
        await loadPreparationRecords();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setRecord(
          resolvedPreparationId ? getPreparationRecordById(resolvedPreparationId) : null
        );
      }
    };

    refreshRecord().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshRecord().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, resolvedPreparationId]);

  const handleDeletePreparation = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Delete preparation request?',
      'This preparation request will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePreparationRecord(record.id);
              Alert.alert(
                'Deleted',
                `${record.unitName} preparation request has been deleted.`,
                [
                  {
                    text: 'OK',
                    onPress: () => router.dismiss(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Unable to delete preparation',
                error instanceof Error
                  ? error.message
                  : 'The preparation request could not be deleted right now.'
              );
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadPreparationRecords();
      setRecord(
        resolvedPreparationId ? getPreparationRecordById(resolvedPreparationId) : null
      );
    } catch (error) {
      setRecord(
        resolvedPreparationId ? getPreparationRecordById(resolvedPreparationId) : null
      );
      Alert.alert(
        'Unable to refresh preparation details',
        error instanceof Error
          ? error.message
          : 'The latest preparation details could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprovePreparation = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Approve preparation request?',
      `${record.unitName} will be moved to In Dispatch and assigned to the dispatcher queue.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setRecord(
                await approvePreparationRequest(
                  record.id,
                  role,
                  user?.name ?? 'System User'
                )
              );
            } catch (error) {
              Alert.alert(
                'Unable to approve request',
                error instanceof Error
                  ? error.message
                  : 'The preparation request could not be approved right now.'
              );
            }
          },
        },
      ]
    );
  };

  const handleRejectPreparation = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Reject preparation request?',
      `${record.unitName} will be marked as Rejected and removed from the dispatcher queue.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setRecord(await rejectPreparationRequest(record.id));
            } catch (error) {
              Alert.alert(
                'Unable to reject request',
                error instanceof Error
                  ? error.message
                  : 'The preparation request could not be rejected right now.'
              );
            }
          },
        },
      ]
    );
  };

  const handleCompletePreparation = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Mark preparation as completed?',
      `${record.unitName} is already ready for release and will now be marked as Completed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Completed',
          onPress: async () => {
            try {
              setRecord(await markPreparationCompleted(record.id));
            } catch (error) {
              Alert.alert(
                'Unable to update preparation',
                error instanceof Error
                  ? error.message
                  : 'The preparation request could not be updated right now.'
              );
            }
          },
        },
      ]
    );
  };

  const handleConfirmReadyForRelease = () => {
    if (!record) {
      return;
    }

    Alert.alert(
      'Confirm ready for release?',
      `${record.unitName} has a completed dispatcher checklist and will now be marked as Ready for Release.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setRecord(await confirmPreparationReadyForRelease(record.id));
            } catch (error) {
              Alert.alert(
                'Unable to confirm ready for release',
                error instanceof Error
                  ? error.message
                  : 'The preparation request could not be updated right now.'
              );
            }
          },
        },
      ]
    );
  };

  if (!record) {
    return (
      <View style={styles.container}>
        <Header
          title="Preparation Details"
          leftIcon={
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={theme.colors.text}
            />
          }
          onLeftPress={() => router.dismiss()}
        />

        <View style={styles.emptyStateWrap}>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Preparation not found</Text>
            <Text style={styles.emptyText}>
              The selected preparation record could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const canReviewPreparation =
    role === UserRole.ADMIN || role === UserRole.SUPERVISOR;
  const checklistIsComplete =
    record.dispatcherChecklist.length > 0 &&
    record.dispatcherChecklist.every((item) => item.completed);
  const canApproveOrReject =
    canReviewPreparation && record.status === PreparationStatus.PENDING;
  const canConfirmReadyForRelease =
    canReviewPreparation &&
    record.status === PreparationStatus.IN_DISPATCH &&
    checklistIsComplete;
  const canMarkCompleted =
    role === UserRole.ADMIN &&
    record.status === PreparationStatus.READY_FOR_RELEASE;
  const canEditPreparation =
    access.canEdit && isPreparationEditable(record.status);

  return (
    <View style={styles.container}>
      <Header
        title="Preparation Details"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.dismiss()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        <AccessScopeNotice
          title={access.scopeLabel}
          message={access.scopeNote}
          style={styles.notice}
        />

        <Card style={styles.card} variant="elevated" padding="large">
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{record.unitName}</Text>
              <Text style={styles.heroSubtitle}>{record.variation}</Text>
            </View>
            <StatusBadge
              status={getPreparationBadgeStatus(record.status)}
              label={getPreparationStatusLabel(record.status)}
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Conduction Number</Text>
              <Text style={styles.metricValue}>{record.conductionNumber}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Customer</Text>
              <Text style={styles.metricValue}>{record.customerName}</Text>
            </View>
          </View>

          <ProgressBar
            progress={record.progress}
            label="Preparation Progress"
            style={styles.progress}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Requested Services</Text>
          {record.requestedServices.map((service, index) => (
            <View
              key={service}
              style={[
                styles.row,
                index < record.requestedServices.length - 1
                  ? styles.rowDivider
                  : null,
              ]}
            >
              <Text style={styles.rowLabel}>Service {index + 1}</Text>
              <Text style={styles.rowValue}>
                {formatRequestedServices([service], record.customRequests)}
              </Text>
            </View>
          ))}
        </Card>

        {record.customRequests.length ? (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Custom Requests</Text>
            {record.customRequests.map((request, index) => (
              <View
                key={`${request}-${index}`}
                style={[
                  styles.row,
                  index < record.customRequests.length - 1
                    ? styles.rowDivider
                    : null,
                ]}
              >
                <Text style={styles.rowLabel}>Request {index + 1}</Text>
                <Text style={styles.rowValue}>{request}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          {[
            { label: 'Customer Name', value: record.customerName },
            { label: 'Contact No', value: record.customerContactNo },
            { label: 'Date Created', value: record.createdAt },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 2 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Workflow</Text>
          {[
            {
              label: 'Requested By',
              value: getPreparationRecordRequesterLabel(record),
            },
            {
              label: 'Approval',
              value: getPreparationApprovalLabel(record),
            },
            {
              label: 'Assigned Dispatcher',
              value: record.dispatcherName ?? 'Unassigned',
            },
            {
              label: 'Ready for Release',
              value: record.readyForReleaseAt ?? 'Not marked yet',
            },
            {
              label: 'Completed At',
              value: record.completedAt ?? 'Not completed yet',
            },
          ].map((item, index, items) => (
            <View
              key={item.label}
              style={[
                styles.row,
                index < items.length - 1 ? styles.rowDivider : null,
              ]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{record.notes || 'No notes added.'}</Text>
        </Card>

        {canApproveOrReject ||
        canConfirmReadyForRelease ||
        canMarkCompleted ||
        canEditPreparation ||
        access.canDelete ? (
          <View style={styles.actions}>
            {canApproveOrReject ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  activeOpacity={0.88}
                  onPress={handleApprovePreparation}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.approveButtonText]}
                  >
                    Approve Request
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  activeOpacity={0.88}
                  onPress={handleRejectPreparation}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.rejectButtonText]}
                  >
                    Reject Request
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {canConfirmReadyForRelease ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.statusActionButton, styles.releaseButton]}
                  activeOpacity={0.88}
                  onPress={handleConfirmReadyForRelease}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.releaseButtonText]}
                  >
                    Confirm Ready for Release
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {canMarkCompleted ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.statusActionButton, styles.releaseButton]}
                  activeOpacity={0.88}
                  onPress={handleCompletePreparation}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.releaseButtonText]}
                  >
                    Mark Completed
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {canEditPreparation ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: getRoleRoute(role, 'preparation-form'),
                      params: {
                        mode: 'edit',
                        preparationId: record.id,
                      },
                    })
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={theme.colors.white}
                  />
                  <Text style={[styles.actionButtonText, styles.editButtonText]}>
                    Edit Prep
                  </Text>
                </TouchableOpacity>
              ) : null}

              {access.canDelete ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  activeOpacity={0.88}
                  onPress={handleDeletePreparation}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete Request
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyStateWrap: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontFamily: theme.fonts.family.sans,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
  },
  notice: {
    marginBottom: theme.spacing.base,
  },
  card: {
    marginBottom: theme.spacing.base,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  heroSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  metricTile: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  progress: {
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
    fontFamily: theme.fonts.family.sans,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  statusActionButton: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
  },
  approveButton: {
    backgroundColor: theme.colors.success,
    borderWidth: 1,
    borderColor: '#0E7A37',
  },
  releaseButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
  approveButtonText: {
    color: theme.colors.white,
  },
  releaseButtonText: {
    color: theme.colors.white,
  },
  editButtonText: {
    color: theme.colors.white,
  },
  rejectButtonText: {
    color: theme.colors.error,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
});
