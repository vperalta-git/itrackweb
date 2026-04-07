import React, { useEffect, useMemo, useState } from 'react';
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
  MapViewComponent,
  StatusBadge,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  deleteDriverAllocation,
  findDriverAllocationLocation,
  findDriverAllocationRecord,
  formatDriverAllocationCreatedDate,
  formatDriverAllocationStatusLabel,
  getDriverAllocationBadgeStatus,
  getDriverAllocationInitialRegion,
  getDriverAllocationRoute,
  loadDriverAllocations,
} from '@/src/mobile/data/driver-allocation';
import {
  getModuleAccess,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { AllocationStatus, UserRole } from '@/src/mobile/types';

const DEFAULT_IN_TRANSIT_PROGRESS = 0.62;
const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDriverLiveLocation = (
  allocation: ReturnType<typeof findDriverAllocationRecord>
) => {
  if (!allocation) {
    return null;
  }

  const pickup = findDriverAllocationLocation(allocation.pickupId);
  const destination = findDriverAllocationLocation(allocation.destinationId);

  if (!pickup || !destination) {
    return null;
  }

  const routeProgress = Math.min(
    Math.max(allocation.routeProgress ?? DEFAULT_IN_TRANSIT_PROGRESS, 0),
    1
  );

  return {
    latitude:
      pickup.location.latitude +
      (destination.location.latitude - pickup.location.latitude) * routeProgress,
    longitude:
      pickup.location.longitude +
      (destination.location.longitude - pickup.location.longitude) * routeProgress,
  };
};

const formatRemainingDistanceValue = (
  allocation: ReturnType<typeof findDriverAllocationRecord>
) => {
  if (!allocation || allocation.status !== AllocationStatus.IN_TRANSIT) {
    return null;
  }

  const pickup = findDriverAllocationLocation(allocation.pickupId);
  const destination = findDriverAllocationLocation(allocation.destinationId);

  if (!pickup || !destination) {
    return null;
  }

  const latitudeDelta = toRadians(
    destination.location.latitude - pickup.location.latitude
  );
  const longitudeDelta = toRadians(
    destination.location.longitude - pickup.location.longitude
  );
  const pickupLatitude = toRadians(pickup.location.latitude);
  const destinationLatitude = toRadians(destination.location.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(pickupLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const totalDistanceKm =
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const routeProgress = Math.min(
    Math.max(allocation.routeProgress ?? DEFAULT_IN_TRANSIT_PROGRESS, 0),
    1
  );
  const remainingDistanceKm = Math.max(totalDistanceKm * (1 - routeProgress), 0);

  return `${remainingDistanceKm.toFixed(1)} km`;
};

export default function DriverDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { allocationId, driverId } = useLocalSearchParams<{
    allocationId?: string | string[];
    driverId?: string | string[];
  }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'driverAllocation');
  const resolvedAllocationId = Array.isArray(allocationId)
    ? allocationId[0]
    : allocationId;
  const fallbackDriverId = Array.isArray(driverId) ? driverId[0] : driverId;
  const [allocation, setAllocation] = useState(() =>
    findDriverAllocationRecord(resolvedAllocationId ?? fallbackDriverId ?? null)
  );

  useEffect(() => {
    let isActive = true;
    const syncAllocation = async () => {
      try {
        await loadDriverAllocations();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setAllocation(
          findDriverAllocationRecord(resolvedAllocationId ?? fallbackDriverId ?? null)
        );
      }
    };

    syncAllocation().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      syncAllocation().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, fallbackDriverId, resolvedAllocationId]);
  const pickup = useMemo(
    () => findDriverAllocationLocation(allocation?.pickupId ?? null),
    [allocation?.pickupId]
  );
  const destination = useMemo(
    () => findDriverAllocationLocation(allocation?.destinationId ?? null),
    [allocation?.destinationId]
  );
  const driverLiveLocation = useMemo(
    () => getDriverLiveLocation(allocation),
    [allocation]
  );
  const routeMarkers = useMemo(() => {
    const markers = [];

    if (pickup) {
      markers.push({
        id: 'pickup-point',
        location: pickup.location,
        title: pickup.label,
        description: `Pickup: ${pickup.hint}`,
        type: 'checkpoint' as const,
      });
    }

    if (destination) {
      markers.push({
        id: 'destination-point',
        location: destination.location,
        title: destination.label,
        description: `Destination: ${destination.hint}`,
        type: 'destination' as const,
      });
    }

    if (driverLiveLocation && allocation?.status === AllocationStatus.IN_TRANSIT) {
      markers.push({
        id: 'driver-live-point',
        location: driverLiveLocation,
        title: allocation.driverName,
        description: `Live position - ETA ${allocation.eta}`,
        type: 'driver' as const,
        status: 'active',
      });
    }

    return markers;
  }, [allocation?.driverName, allocation?.eta, allocation?.status, destination, driverLiveLocation, pickup]);
  const routePreview = useMemo(
    () => {
      if (
        allocation?.status === AllocationStatus.IN_TRANSIT &&
        driverLiveLocation &&
        destination
      ) {
        return [[driverLiveLocation, destination.location]];
      }

      return getDriverAllocationRoute(
        allocation?.pickupId ?? null,
        allocation?.destinationId ?? null
      );
    },
    [
      allocation?.destinationId,
      allocation?.pickupId,
      allocation?.status,
      destination,
      driverLiveLocation,
    ]
  );
  const initialRegion = useMemo(
    () =>
      getDriverAllocationInitialRegion(
        allocation?.pickupId ?? null,
        allocation?.destinationId ?? null
      ),
    [allocation?.destinationId, allocation?.pickupId]
  );

  if (!allocation) {
    return (
      <View style={styles.container}>
        <Header
          title="Driver Allocation Details"
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
              The selected driver allocation could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const remainingDistanceValue = formatRemainingDistanceValue(allocation);

  const handleDeleteAllocation = () => {
    Alert.alert(
      'Delete allocation?',
      'This driver allocation record will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDriverAllocation(allocation.id);
            router.dismiss();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Driver Allocation Details"
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
              <Text style={styles.heroTitle}>{allocation.unitName}</Text>
              <Text style={styles.heroSubtitle}>{allocation.variation}</Text>
            </View>
            <StatusBadge
              status={getDriverAllocationBadgeStatus(allocation.status)}
              label={formatDriverAllocationStatusLabel(allocation.status)}
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Driver</Text>
              <Text style={styles.metricValue}>{allocation.driverName}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>ETA</Text>
              <Text style={styles.metricValue}>{allocation.eta}</Text>
            </View>
            {remainingDistanceValue ? (
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>KM Left</Text>
                <Text style={styles.metricValue}>{remainingDistanceValue}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {pickup && destination ? (
          <View style={styles.mapShell}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>Route Preview</Text>
              <Text style={styles.mapSubtitle}>
                {allocation.pickupLabel} to {allocation.destinationLabel}
              </Text>
            </View>

            <MapViewComponent
              markers={routeMarkers}
              routes={routePreview}
              initialRegion={initialRegion}
              style={styles.map}
            />
          </View>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {[
            { label: 'Unit Name', value: allocation.unitName },
            { label: 'Variation', value: allocation.variation },
            {
              label: 'Conduction Number',
              value: allocation.conductionNumber,
            },
            { label: 'Assigned Driver', value: allocation.driverName },
            { label: 'Driver Contact', value: allocation.driverPhone },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[styles.row, index < 4 ? styles.rowDivider : null]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          {[
            { label: 'Pickup', value: allocation.pickupLabel },
            { label: 'Destination', value: allocation.destinationLabel },
            {
              label: 'Status',
              value: formatDriverAllocationStatusLabel(allocation.status),
            },
            {
              label: 'Date Created',
              value: formatDriverAllocationCreatedDate(allocation.createdAt),
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

        {access.canEdit || access.canDelete ? (
          <View style={styles.actions}>
            <View style={styles.actionRow}>
              {access.canEdit ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: getRoleRoute(role, 'driver-allocation-form'),
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
                    Edit Allocation
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
                    Delete Allocation
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
  mapShell: {
    marginBottom: theme.spacing.base,
  },
  mapHeader: {
    marginBottom: theme.spacing.sm,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  mapSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  map: {
    height: 300,
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
    flexShrink: 1,
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
