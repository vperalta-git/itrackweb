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
  StatusBadge,
} from '@/src/mobile/components';
import { useAuth } from '@/src/mobile/context/AuthContext';
import { theme } from '@/src/mobile/constants/theme';
import {
  deleteTestDriveBooking,
  formatTestDriveCreatedDate,
  formatTestDriveReference,
  formatTestDriveSchedule,
  formatTestDriveStatusLabel,
  getTestDriveBadgeStatus,
  getTestDriveBookingById,
  loadTestDriveBookings,
} from '@/src/mobile/data/test-drive';
import {
  getModuleAccess,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

export default function TestDriveDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'testDrive');
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const [booking, setBooking] = useState(() =>
    resolvedBookingId ? getTestDriveBookingById(resolvedBookingId) : null
  );

  useEffect(() => {
    let isActive = true;
    const refreshBooking = async () => {
      try {
        await loadTestDriveBookings();
      } catch {
        // Keep the latest cached record when refresh fails.
      }

      if (isActive) {
        setBooking(
          resolvedBookingId ? getTestDriveBookingById(resolvedBookingId) : null
        );
      }
    };

    refreshBooking().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshBooking().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation, resolvedBookingId]);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header
          title="Booking Details"
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
            <Text style={styles.emptyTitle}>Booking not found</Text>
            <Text style={styles.emptyText}>
              The selected test drive booking could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const handleExportBooking = async () => {
    await shareExport({
      title: `Test Drive Request ${formatTestDriveReference(booking.id)}`,
      subtitle: `${booking.customerName} - ${booking.unitName}`,
      filename: `${formatTestDriveReference(booking.id)
        .toLowerCase()
        .replaceAll(' ', '-')
        .replaceAll('#', '')}.pdf`,
      metadata: [
        {
          label: 'Reference',
          value: formatTestDriveReference(booking.id),
        },
        {
          label: 'Status',
          value: formatTestDriveStatusLabel(booking.status),
        },
        {
          label: 'Scheduled',
          value: formatTestDriveSchedule(
            booking.scheduledDate,
            booking.scheduledTime
          ),
        },
      ],
      columns: [
        {
          header: 'Request No.',
          value: (record) => formatTestDriveReference(record.id),
        },
        { header: 'Customer', value: (record) => record.customerName },
        { header: 'Contact', value: (record) => record.customerPhone },
        {
          header: 'Vehicle',
          value: (record) => `${record.unitName} ${record.variation}`,
        },
        {
          header: 'Conduction Number',
          value: (record) => record.conductionNumber,
        },
        {
          header: 'Schedule',
          value: (record) =>
            formatTestDriveSchedule(
              record.scheduledDate,
              record.scheduledTime
            ),
        },
        {
          header: 'Status',
          value: (record) => formatTestDriveStatusLabel(record.status),
        },
        { header: 'Notes', value: (record) => record.notes || '-' },
      ],
      rows: [booking],
      errorMessage: 'The test drive booking could not be exported right now.',
    });
  };

  const handleDeleteBooking = () => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete booking?',
      'This test drive booking will be removed from the list and this action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTestDriveBooking(booking.id);
            router.dismiss();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Booking Details"
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
        onRightPress={access.canExportPdf ? handleExportBooking : undefined}
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
              <Text style={styles.eyebrow}>
                {formatTestDriveReference(booking.id)}
              </Text>
              <Text style={styles.heroTitle}>{booking.unitName}</Text>
              <Text style={styles.heroSubtitle}>{booking.variation}</Text>
            </View>
            <StatusBadge
              status={getTestDriveBadgeStatus(booking.status)}
              label={formatTestDriveStatusLabel(booking.status)}
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Customer</Text>
              <Text style={styles.metricValue}>{booking.customerName}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Phone Number</Text>
              <Text style={styles.metricValue}>{booking.customerPhone}</Text>
            </View>
          </View>

          {access.canExportPdf ? (
            <Button
              title="Export Booking PDF"
              size="small"
              variant="outline"
              icon={
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={theme.colors.text}
                />
              }
              onPress={handleExportBooking}
              style={styles.exportButton}
            />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          {[
            { label: 'Unit Name', value: booking.unitName },
            { label: 'Variation', value: booking.variation },
            { label: 'Conduction Number', value: booking.conductionNumber },
            { label: 'Body Color', value: booking.bodyColor },
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
          <Text style={styles.sectionTitle}>Booking Schedule</Text>
          {[
            {
              label: 'Date and Time',
              value: formatTestDriveSchedule(
                booking.scheduledDate,
                booking.scheduledTime
              ),
            },
            {
              label: 'Booking Status',
              value: formatTestDriveStatusLabel(booking.status),
            },
            {
              label: 'Date Created',
              value: formatTestDriveCreatedDate(booking.createdAt),
            },
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
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>
            {booking.notes?.trim() ? booking.notes : 'No notes added.'}
          </Text>
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
                      pathname: getRoleRoute(role, 'test-drive-form'),
                      params: {
                        mode: 'edit',
                        bookingId: booking.id,
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
                    Edit Booking
                  </Text>
                </TouchableOpacity>
              ) : null}

              {access.canDelete ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  activeOpacity={0.88}
                  onPress={handleDeleteBooking}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.colors.error}
                  />
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete Booking
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
  eyebrow: {
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
    flexShrink: 1,
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
