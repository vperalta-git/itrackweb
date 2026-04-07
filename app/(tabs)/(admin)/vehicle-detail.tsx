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
  Card,
  Header,
  StatusBadge,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  getModuleAccess,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole, type Vehicle } from '@/src/mobile/types';
import {
  deleteVehicleStock,
  findVehicleStockById,
  formatVehicleCreatedDate,
  formatVehicleStatusLabel,
  getVehicleStatusBadgeStatus,
  loadVehicleStocks,
} from '@/src/mobile/data/vehicle-stocks';

export default function VehicleDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string | string[] }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'vehicleStocks');
  const resolvedVehicleId = Array.isArray(vehicleId) ? vehicleId[0] : vehicleId;
  const [vehicle, setVehicle] = useState<Vehicle | null>(() =>
    resolvedVehicleId ? findVehicleStockById(resolvedVehicleId) : null
  );

  useEffect(() => {
    let isActive = true;
    const syncVehicle = async () => {
      try {
        await loadVehicleStocks();
      } catch {
        // Keep the most recent cached value when the network refresh fails.
      }

      if (isActive) {
        setVehicle(resolvedVehicleId ? findVehicleStockById(resolvedVehicleId) : null);
      }
    };

    syncVehicle().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncVehicle().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, resolvedVehicleId]);

  if (!vehicle) {
    return (
      <View style={styles.container}>
        <Header
          title="Vehicle Details"
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
            <Text style={styles.emptyTitle}>Vehicle not found</Text>
            <Text style={styles.emptyText}>
              The selected stock record could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const handleDeleteVehicle = () => {
    Alert.alert(
      'Delete vehicle?',
      'This stock record will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVehicleStock(vehicle.id);
            router.dismiss();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Vehicle Details"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.dismiss()}
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
              <Text style={styles.heroTitle}>{vehicle.unitName}</Text>
              <Text style={styles.heroSubtitle}>{vehicle.variation}</Text>
            </View>
            <StatusBadge
              status={getVehicleStatusBadgeStatus(vehicle.status)}
              label={formatVehicleStatusLabel(vehicle.status)}
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Conduction Number</Text>
              <Text style={styles.metricValue}>{vehicle.conductionNumber}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Body Color</Text>
              <Text style={styles.metricValue}>{vehicle.bodyColor}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Unit Name', value: vehicle.unitName },
            { label: 'Variation', value: vehicle.variation },
            { label: 'Conduction Number', value: vehicle.conductionNumber },
            { label: 'Body Color', value: vehicle.bodyColor },
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
          <Text style={styles.sectionTitle}>Stock Settings</Text>
          {[
            { label: 'Status', value: formatVehicleStatusLabel(vehicle.status) },
            {
              label: 'Date Created',
              value: formatVehicleCreatedDate(vehicle.createdAt),
            },
            { label: 'Notes', value: vehicle.notes?.trim() || 'No notes added' },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 2 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text
                style={[
                  styles.rowValue,
                  item.label === 'Notes' ? styles.notesValue : null,
                ]}
              >
                {item.value}
              </Text>
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
                      pathname: getRoleRoute(role, 'add-stock'),
                      params: {
                        mode: 'edit',
                        vehicleId: vehicle.id,
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
                    Edit Vehicle
                  </Text>
                </TouchableOpacity>
              ) : null}

              {access.canDelete ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  activeOpacity={0.88}
                  onPress={handleDeleteVehicle}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete Vehicle
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
  notesValue: {
    flex: 1,
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
