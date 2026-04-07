import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  AccessScopeNotice,
  Button,
  Card,
  Header,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  deleteUnitAgentAllocation,
  findUnitAgentAllocationRecord,
  formatAllocationCreatedDate,
  formatAllocationReference,
  loadUnitAgentAllocations,
} from '@/src/mobile/data/unit-agent-allocation';
import { findVehicleStockById } from '@/src/mobile/data/vehicle-stocks';
import { getModuleAccess } from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

export default function AllocationDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { allocationId } = useLocalSearchParams<{
    allocationId?: string | string[];
  }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'unitAgentAllocation');
  const resolvedAllocationId = Array.isArray(allocationId)
    ? allocationId[0]
    : allocationId;
  const [allocation, setAllocation] = useState(() =>
    resolvedAllocationId ? findUnitAgentAllocationRecord(resolvedAllocationId) : null
  );

  useEffect(() => {
    let isActive = true;
    const refreshAllocation = async () => {
      try {
        await loadUnitAgentAllocations();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setAllocation(
          resolvedAllocationId
            ? findUnitAgentAllocationRecord(resolvedAllocationId)
            : null
        );
      }
    };

    refreshAllocation().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshAllocation().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, resolvedAllocationId]);

  if (!allocation) {
    return (
      <View style={styles.container}>
        <Header
          title="Agent Allocation Details"
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
            <Text style={styles.emptyTitle}>Allocation not found</Text>
            <Text style={styles.emptyText}>
              The selected agent allocation could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const linkedVehicle = findVehicleStockById(allocation.unitId);

  const handleExportAllocation = async () => {
    const conductionNumber = linkedVehicle?.conductionNumber ?? 'unassigned';

    await shareExport({
      title: `Agent Allocation ${conductionNumber.toUpperCase()}`,
      subtitle: `${allocation.unitName} - ${allocation.salesAgentName}`,
      filename: `agent-allocation-${conductionNumber.toLowerCase()}.pdf`,
      metadata: [
        { label: 'Reference', value: formatAllocationReference(allocation.id) },
        { label: 'Manager', value: allocation.managerName },
        { label: 'Sales Agent', value: allocation.salesAgentName },
      ],
      columns: [
        { header: 'Unit Name', value: (record) => record.unitName },
        {
          header: 'Conduction Number',
          value: () => linkedVehicle?.conductionNumber ?? '-',
        },
        {
          header: 'Body Color',
          value: () => linkedVehicle?.bodyColor ?? '-',
        },
        { header: 'Variation', value: (record) => record.unitVariation },
        { header: 'Assigned To', value: (record) => record.salesAgentName },
        { header: 'Manager', value: (record) => record.managerName },
        {
          header: 'Date Created',
          value: (record) => formatAllocationCreatedDate(record.createdAt),
        },
      ],
      rows: [allocation],
      errorMessage: 'The agent allocation record could not be exported right now.',
    });
  };

  const handleDeleteAllocation = () => {
    Alert.alert(
      'Delete agent allocation?',
      'This agent allocation record will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUnitAgentAllocation(allocation.id);
            router.dismiss();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Agent Allocation Details"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.dismiss()}
        rightIcon={
          access.canExportPdf ? (
            <Ionicons
              name="download-outline"
              size={18}
              color={theme.colors.text}
            />
          ) : undefined
        }
        onRightPress={
          access.canExportPdf ? handleExportAllocation : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <AccessScopeNotice
          title={access.scopeLabel}
          message={access.scopeNote}
          style={styles.notice}
        />

        <Card style={styles.card} variant="elevated" padding="large">
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>
                {formatAllocationReference(allocation.id)}
              </Text>
              <Text style={styles.heroTitle}>{allocation.unitName}</Text>
              <Text style={styles.heroSubtitle}>{allocation.unitVariation}</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Manager</Text>
              <Text style={styles.metricValue}>{allocation.managerName}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Sales Agent</Text>
              <Text style={styles.metricValue}>{allocation.salesAgentName}</Text>
            </View>
          </View>

          {access.canExportPdf ? (
            <Button
              title="Export Allocation PDF"
              size="small"
              variant="outline"
              icon={
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={theme.colors.text}
                />
              }
              onPress={handleExportAllocation}
              style={styles.exportButton}
            />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Unit', value: allocation.unitName },
            { label: 'Variation', value: allocation.unitVariation },
            { label: 'Manager', value: allocation.managerName },
            { label: 'Sales Agent', value: allocation.salesAgentName },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 3 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Record Details</Text>
          {[
            {
              label: 'Allocation Reference',
              value: formatAllocationReference(allocation.id),
            },
            {
              label: 'Date Created',
              value: formatAllocationCreatedDate(allocation.createdAt),
            },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 1 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {access.canEdit || access.canDelete ? (
          <View style={styles.actions}>
            <View style={styles.actionRow}>
              {access.canEdit ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/(allocations)/allocation-form',
                      params: {
                        mode: 'edit',
                        allocationId: allocation.id,
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
                    Edit Agent Allocation
                  </Text>
                </TouchableOpacity>
              ) : null}

              {access.canDelete ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  activeOpacity={0.88}
                  onPress={handleDeleteAllocation}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete Agent Allocation
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
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.colors.textSubtle,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
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
  },
  metricTile: {
    flex: 1,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  exportButton: {
    marginTop: theme.spacing.base,
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
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  actions: {
    marginTop: theme.spacing.xs,
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
  editButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
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
  editButtonText: {
    color: theme.colors.white,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
});
