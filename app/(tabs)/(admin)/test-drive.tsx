import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import {
  Button,
  Card,
  CardActionMenu,
  type CardActionMenuItem,
  EmptyState,
  FilterSummaryCard,
  SearchFiltersBar,
  StatusBadge,
  WorkspaceScaffold,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  canApprovePendingTestDriveForRole,
  canCompleteApprovedTestDriveForRole,
  deleteTestDriveBooking,
  formatTestDriveCreatedDate,
  formatTestDriveReference,
  formatTestDriveSchedule,
  formatTestDriveStatusLabel,
  getEligibleTestDriveVehicleSummary,
  getTestDriveBadgeStatus,
  getTestDriveBookings,
  getTestDriveStatusAccentColor,
  loadTestDriveBookings,
  TestDriveBookingRecord,
  updateTestDriveBookingStatus,
} from '@/src/mobile/data/test-drive';
import {
  getModuleAccess,
  getRoleLabel,
  getRoleRoute,
} from '@/src/mobile/navigation/access';
import { TestDriveStatus, UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

const ITEMS_PER_PAGE = 5;

const getStatusFilterAccentColor = (statusFilter: string) => {
  switch (statusFilter) {
    case TestDriveStatus.PENDING:
      return theme.colors.warning;
    case TestDriveStatus.APPROVED:
      return theme.colors.primary;
    case TestDriveStatus.COMPLETED:
      return theme.colors.success;
    case TestDriveStatus.CANCELLED:
      return theme.colors.error;
    case TestDriveStatus.NO_SHOW:
      return theme.colors.warning;
    default:
      return theme.colors.textSubtle;
  }
};

export default function TestDriveScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'testDrive');
  const canApprovePendingBookings = canApprovePendingTestDriveForRole(role);
  const canUpdateApprovedBookings = canCompleteApprovedTestDriveForRole(role);
  const eligibleVehicleSummary = getEligibleTestDriveVehicleSummary();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<TestDriveBookingRecord[]>(
    getTestDriveBookings()
  );
  const statusFilterLabel =
    statusFilter === 'all'
      ? 'All booking stages'
      : formatTestDriveStatusLabel(statusFilter as TestDriveStatus);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const query = searchValue.toLowerCase();
        const matchesSearch =
          booking.unitName.toLowerCase().includes(query) ||
          booking.variation.toLowerCase().includes(query) ||
          booking.conductionNumber.toLowerCase().includes(query) ||
          booking.customerName.toLowerCase().includes(query) ||
          booking.customerPhone.toLowerCase().includes(query) ||
          formatTestDriveSchedule(
            booking.scheduledDate,
            booking.scheduledTime
          ).toLowerCase().includes(query) ||
          formatTestDriveStatusLabel(booking.status)
            .toLowerCase()
            .includes(query);
        const matchesStatus =
          statusFilter === 'all' || booking.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [bookings, searchValue, statusFilter]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  );
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredBookings]);
  const paginationRangeLabel = useMemo(() => {
    if (!filteredBookings.length) {
      return 'Showing 0 of 0';
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length);

    return `Showing ${start}-${end} of ${filteredBookings.length}`;
  }, [currentPage, filteredBookings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isActive = true;
    const refreshBookings = async () => {
      try {
        const records = await loadTestDriveBookings();

        if (isActive) {
          setBookings(records);
        }
      } catch {
        if (isActive) {
          setBookings(getTestDriveBookings());
        }
      }
    };

    refreshBookings().catch(() => undefined);

    const unsubscribe = navigation.addListener('focus', () => {
      refreshBookings().catch(() => undefined);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const records = await loadTestDriveBookings();
      setBookings(records);
    } catch (error) {
      setBookings(getTestDriveBookings());
      Alert.alert(
        'Unable to refresh test drive bookings',
        error instanceof Error
          ? error.message
          : 'The latest test drive bookings could not be loaded right now.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setStatusFilter('all');
  };

  const handleExportBookings = async () => {
    const statusFilterLabel =
      statusFilter === 'all'
        ? 'All booking stages'
        : formatTestDriveStatusLabel(statusFilter as TestDriveStatus);

    await shareExport({
      title: 'Test Drive Requests Report',
      subtitle:
        statusFilter === 'all'
          ? 'All test drive requests'
          : `Status: ${statusFilterLabel}`,
      metadata: [
        { label: 'Scope', value: getRoleLabel(role) },
        { label: 'Status Filter', value: statusFilterLabel },
        { label: 'Search', value: searchValue || 'None' },
        { label: 'Records', value: String(filteredBookings.length) },
      ],
      columns: [
        {
          header: 'Request No.',
          value: (booking) => formatTestDriveReference(booking.id),
        },
        { header: 'Customer Name', value: (booking) => booking.customerName },
        { header: 'Phone', value: (booking) => booking.customerPhone },
        {
          header: 'Vehicle',
          value: (booking) => `${booking.unitName} ${booking.variation}`,
        },
        {
          header: 'Conduction Number',
          value: (booking) => booking.conductionNumber,
        },
        {
          header: 'Scheduled Date',
          value: (booking) =>
            formatTestDriveSchedule(
              booking.scheduledDate,
              booking.scheduledTime
            ),
        },
        {
          header: 'Status',
          value: (booking) => formatTestDriveStatusLabel(booking.status),
        },
      ],
      rows: filteredBookings,
      emptyStateMessage: 'No matching test drive bookings.',
      errorMessage: 'The test drive records could not be exported right now.',
    });
  };

  const handleOpenCreate = () => {
    if (!access.canCreate) {
      return;
    }

    router.push(getRoleRoute(role, 'test-drive-form') as any);
  };

  const handleEditBooking = (bookingId: string) => {
    if (!access.canEdit) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'test-drive-form'),
      params: {
        mode: 'edit',
        bookingId,
      },
    });
  };

  const handleBookingPress = (bookingId: string) => {
    if (!access.canViewDetails) {
      return;
    }

    router.push({
      pathname: getRoleRoute(role, 'test-drive-detail'),
      params: {
        bookingId,
      },
    });
  };

  const handleDeleteBooking = (bookingId: string, unitName: string) => {
    if (!access.canDelete) {
      return;
    }

    Alert.alert(
      'Delete test drive booking?',
      `${unitName} will be removed from the test drive schedule. This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTestDriveBooking(bookingId);
            setBookings(getTestDriveBookings());
          },
        },
      ]
    );
  };

  const handleUpdateBookingStatus = (
    bookingId: string,
    unitName: string,
    nextStatus: TestDriveStatus,
    title: string,
    message: string
  ) => {
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await updateTestDriveBookingStatus(bookingId, nextStatus);
            setBookings(getTestDriveBookings());
          } catch (error) {
            Alert.alert(
              'Unable to update booking',
              error instanceof Error
                ? error.message
                : `${unitName} could not be updated right now.`
            );
          }
        },
      },
    ]);
  };

  const handleApproveBooking = (bookingId: string, unitName: string) => {
    handleUpdateBookingStatus(
      bookingId,
      unitName,
      TestDriveStatus.APPROVED,
      'Approve booking?',
      `${unitName} will move from Pending to Approved.`
    );
  };

  const handleRejectBooking = (bookingId: string, unitName: string) => {
    handleUpdateBookingStatus(
      bookingId,
      unitName,
      TestDriveStatus.CANCELLED,
      'Reject booking?',
      `${unitName} will be rejected and marked as Cancelled.`
    );
  };

  const handleCompleteBooking = (bookingId: string, unitName: string) => {
    handleUpdateBookingStatus(
      bookingId,
      unitName,
      TestDriveStatus.COMPLETED,
      'Mark booking as completed?',
      `${unitName} will move from Approved to Completed.`
    );
  };

  const handleCancelApprovedBooking = (
    bookingId: string,
    unitName: string
  ) => {
    handleUpdateBookingStatus(
      bookingId,
      unitName,
      TestDriveStatus.CANCELLED,
      'Cancel booking?',
      `${unitName} will be marked as Cancelled.`
    );
  };

  const handleNoShowBooking = (bookingId: string, unitName: string) => {
    handleUpdateBookingStatus(
      bookingId,
      unitName,
      TestDriveStatus.NO_SHOW,
      'Mark booking as no show?',
      `${unitName} will be marked as No Show.`
    );
  };

  return (
    <WorkspaceScaffold
      eyebrow={getRoleLabel(role)}
      title="Test Drive"
      subtitle="Manage customer bookings with one combined flow for units and schedules."
      action={
        access.canCreate ? (
          <Button
            title="Add Booking"
            size="small"
            onPress={handleOpenCreate}
            icon={
              <Ionicons
                name="add-outline"
                size={18}
                color={theme.colors.white}
              />
            }
          />
        ) : undefined
      }
      toolbar={
        <SearchFiltersBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search vehicle, customer, phone, schedule, or status"
          filters={[
            { label: 'All', value: 'all' },
            { label: 'Pending', value: TestDriveStatus.PENDING },
            { label: 'Approved', value: TestDriveStatus.APPROVED },
            { label: 'Completed', value: TestDriveStatus.COMPLETED },
            { label: 'Cancelled', value: TestDriveStatus.CANCELLED },
            { label: 'No Show', value: TestDriveStatus.NO_SHOW },
          ]}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          onClearFilters={handleClearFilters}
          actions={
            access.canExportPdf
              ? [
                  {
                    key: 'export-test-drive',
                    iconName: 'download-outline',
                    accessibilityLabel: 'Export test drive bookings',
                    onPress: handleExportBookings,
                  },
                ]
              : undefined
          }
        />
      }
      scopeTitle={access.scopeLabel}
      scopeMessage={access.scopeNote}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <FilterSummaryCard
        title="Booking View"
        value={`${filteredBookings.length} of ${bookings.length} bookings shown`}
        iconName="car-sport-outline"
        items={[
          {
            label: 'Status Filter',
            value: statusFilterLabel,
            dotColor: getStatusFilterAccentColor(statusFilter),
          },
          {
            label: 'Eligible Units',
            value: `${eligibleVehicleSummary.eligible} of ${eligibleVehicleSummary.total} ready`,
            iconName: 'checkmark-done-circle-outline',
            iconColor: theme.colors.success,
          },
        ]}
        style={styles.summaryCard}
      />

      <View style={styles.list}>
        {filteredBookings.length ? (
          paginatedBookings.map((booking) => {
            const menuItems: CardActionMenuItem[] = [];

            if (
              booking.status === TestDriveStatus.PENDING &&
              canApprovePendingBookings
            ) {
              menuItems.push(
                {
                  key: `approve-${booking.id}`,
                  label: 'Approve',
                  iconName: 'checkmark-circle-outline',
                  onPress: () => handleApproveBooking(booking.id, booking.unitName),
                },
                {
                  key: `reject-${booking.id}`,
                  label: 'Reject',
                  iconName: 'close-circle-outline',
                  tone: 'destructive',
                  onPress: () => handleRejectBooking(booking.id, booking.unitName),
                }
              );
            }

            if (
              booking.status === TestDriveStatus.APPROVED &&
              canUpdateApprovedBookings
            ) {
              menuItems.push(
                {
                  key: `complete-${booking.id}`,
                  label: 'Mark as Completed',
                  iconName: 'checkmark-done-outline',
                  onPress: () =>
                    handleCompleteBooking(booking.id, booking.unitName),
                },
                {
                  key: `cancel-${booking.id}`,
                  label: 'Cancelled',
                  iconName: 'close-outline',
                  tone: 'destructive',
                  onPress: () =>
                    handleCancelApprovedBooking(booking.id, booking.unitName),
                },
                {
                  key: `no-show-${booking.id}`,
                  label: 'No Show',
                  iconName: 'person-remove-outline',
                  tone: 'destructive',
                  onPress: () => handleNoShowBooking(booking.id, booking.unitName),
                }
              );
            }

            if (access.canEdit) {
              menuItems.push({
                key: `edit-${booking.id}`,
                label: 'Edit Booking',
                iconName: 'create-outline',
                onPress: () => handleEditBooking(booking.id),
              });
            }

            if (access.canDelete) {
              menuItems.push({
                key: `delete-${booking.id}`,
                label: 'Delete',
                iconName: 'trash-outline',
                tone: 'destructive',
                onPress: () => handleDeleteBooking(booking.id, booking.unitName),
              });
            }

            return (
              <Card
                key={booking.id}
                style={styles.card}
                variant="elevated"
                padding="large"
                onPress={
                  access.canViewDetails
                    ? () => handleBookingPress(booking.id)
                    : undefined
                }
                disabled={!access.canViewDetails}
              >
                <View
                  style={[
                    styles.accentBar,
                    {
                      backgroundColor: getTestDriveStatusAccentColor(
                        booking.status
                      ),
                    },
                  ]}
                />

                <View style={styles.cardHeader}>
                  <View style={styles.identityRow}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name="speedometer-outline"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.eyebrow}>
                        {formatTestDriveReference(booking.id)}
                      </Text>
                      <Text style={styles.title}>{booking.unitName}</Text>
                      <Text style={styles.subtitle}>{booking.variation}</Text>
                    </View>
                  </View>

                  <View style={styles.headerAside}>
                    {menuItems.length ? (
                      <View style={styles.headerActions}>
                        <CardActionMenu
                          accessibilityLabel={`Open actions for ${booking.unitName}`}
                          items={menuItems}
                        />
                      </View>
                    ) : null}
                    <StatusBadge
                      status={getTestDriveBadgeStatus(booking.status)}
                      label={formatTestDriveStatusLabel(booking.status)}
                      size="small"
                    />
                  </View>
                </View>

                <View style={styles.referenceChip}>
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color={theme.colors.primaryDark}
                  />
                  <Text style={styles.referenceChipLabel}>
                    Conduction Number
                  </Text>
                  <Text style={styles.referenceChipValue}>
                    {booking.conductionNumber}
                  </Text>
                </View>

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Customer Name</Text>
                    <Text style={styles.metricValue}>{booking.customerName}</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Phone Number</Text>
                    <Text style={styles.metricValue}>{booking.customerPhone}</Text>
                  </View>
                </View>

                <View style={styles.schedulePanel}>
                  <View style={styles.scheduleHeading}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={theme.colors.primaryDark}
                    />
                    <Text style={styles.scheduleLabel}>Date and Time</Text>
                  </View>
                  <Text style={styles.scheduleValue}>
                    {formatTestDriveSchedule(
                      booking.scheduledDate,
                      booking.scheduledTime
                    )}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerMeta}>
                    <Ionicons
                      name="color-palette-outline"
                      size={15}
                      color={theme.colors.textSubtle}
                    />
                    <Text style={styles.footerHintText}>
                      {booking.bodyColor} - Created{' '}
                      {formatTestDriveCreatedDate(booking.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.notesText}>
                    {booking.notes?.trim() ? booking.notes : 'No notes added.'}
                  </Text>
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No test drive bookings found"
            description="Change the search or booking status filter to see more scheduled drives."
          />
        )}

        {filteredBookings.length ? (
          <View style={styles.paginationWrap}>
            <View style={styles.paginationSummary}>
              <Text style={styles.paginationTitle}>Pagination</Text>
              <Text style={styles.paginationText}>
                {paginationRangeLabel} - {ITEMS_PER_PAGE} items per page
              </Text>
            </View>

            <View style={styles.paginationControls}>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === 1 ? styles.paginationButtonDisabled : null,
                ]}
                activeOpacity={0.88}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <Ionicons
                  name="chevron-back-outline"
                  size={16}
                  color={
                    currentPage === 1
                      ? theme.colors.textSubtle
                      : theme.colors.text
                  }
                />
              </TouchableOpacity>

              <View style={styles.paginationIndicator}>
                <Text style={styles.paginationIndicatorText}>
                  Page {currentPage} of {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  currentPage === totalPages
                    ? styles.paginationButtonDisabled
                    : styles.paginationButtonPrimary,
                ]}
                activeOpacity={0.88}
                disabled={currentPage === totalPages}
                onPress={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color={
                    currentPage === totalPages
                      ? theme.colors.textSubtle
                      : theme.colors.white
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </WorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.base,
    overflow: 'hidden',
  },
  accentBar: {
    height: 5,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
  },
  copy: {
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  headerAside: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
  },
  referenceChip: {
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
  },
  referenceChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  referenceChipValue: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.mono,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: theme.radius.md,
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
  schedulePanel: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    padding: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  scheduleHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  cardFooter: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerHintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 18,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
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
    fontSize: 14,
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
  paginationWrap: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    padding: theme.spacing.base,
    gap: theme.spacing.base,
    ...theme.shadows.sm,
  },
  paginationSummary: {
    gap: 4,
  },
  paginationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.family.sans,
  },
  paginationText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  paginationButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.backgroundAlt,
  },
  paginationButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  paginationButtonDisabled: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  paginationIndicator: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 1,
    borderColor: theme.colors.primarySurfaceStrong,
    paddingHorizontal: theme.spacing.sm,
  },
  paginationIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
    textAlign: 'center',
  },
});
