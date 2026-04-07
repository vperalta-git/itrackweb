import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AccessScopeNotice,
  Button,
  Card,
  Header,
  StatusBadge,
} from '@/src/mobile/components';
import { theme } from '@/src/mobile/constants/theme';
import { useAuth } from '@/src/mobile/context/AuthContext';
import {
  buildReleaseHistoryExportSummary,
  formatReleaseDateTime,
  getReleaseHistoryExportFileName,
  getReleaseHistoryRecordById,
} from '@/src/mobile/data/release-history';
import { getModuleAccess } from '@/src/mobile/navigation/access';
import { UserRole } from '@/src/mobile/types';
import { shareExport } from '@/src/mobile/utils/shareExport';

export default function ReleaseHistoryDetailScreen() {
  const router = useRouter();
  const { releaseId } = useLocalSearchParams();
  const { user } = useAuth();
  const role = user?.role ?? UserRole.ADMIN;
  const access = getModuleAccess(role, 'reports');
  const release = getReleaseHistoryRecordById(String(releaseId ?? ''));

  if (!release) {
    return (
      <View style={styles.container}>
        <Header
          title="Release History"
          leftIcon={
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={theme.colors.text}
            />
          }
          onLeftPress={() => router.back()}
        />

        <View style={styles.emptyStateWrap}>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Release history not found</Text>
            <Text style={styles.emptyText}>
              The selected release record could not be loaded.
            </Text>
          </Card>
        </View>
      </View>
    );
  }

  const vehicleSummary = `${release.variation} - ${release.bodyColor}`;
  const handleExportRelease = async () => {
    await shareExport({
      title: getReleaseHistoryExportFileName(release),
      message: buildReleaseHistoryExportSummary(release),
      errorMessage: 'The release history record could not be exported right now.',
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="Release History"
        leftIcon={
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={theme.colors.text}
          />
        }
        onLeftPress={() => router.back()}
        rightIcon={
          access.canExportPdf ? (
            <Ionicons
              name="download-outline"
              size={18}
              color={theme.colors.text}
            />
          ) : undefined
        }
        onRightPress={access.canExportPdf ? handleExportRelease : undefined}
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
              <Text style={styles.eyebrow}>{release.conductionNumber}</Text>
              <Text style={styles.heroTitle}>{release.unitName}</Text>
              <Text style={styles.heroSubtitle}>{vehicleSummary}</Text>
            </View>
            <StatusBadge
              status="completed"
              label={release.statusLabel}
              size="small"
            />
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Customer</Text>
              <Text style={styles.metricValue}>{release.customerName}</Text>
            </View>
            <View style={styles.metricTile}>
              <Text style={styles.metricLabel}>Release Date</Text>
              <Text style={styles.metricValue}>
                {formatReleaseDateTime(release.releasedAt)}
              </Text>
            </View>
          </View>

          {access.canExportPdf ? (
            <Button
              title="Export Release History"
              size="small"
              variant="outline"
              icon={
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={theme.colors.text}
                />
              }
              onPress={handleExportRelease}
              style={styles.exportButton}
            />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          {[
            { label: 'Unit Name', value: release.unitName },
            { label: 'Variation', value: release.variation },
            { label: 'Conduction No.', value: release.conductionNumber },
            { label: 'Body Color', value: release.bodyColor },
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
          <Text style={styles.sectionTitle}>Agent and Customer</Text>
          {[
            { label: 'Assigned Agent', value: release.assignedAgent },
            {
              label: 'Assigned Date',
              value: formatReleaseDateTime(release.assignedDate),
            },
            { label: 'Customer Name', value: release.customerName },
            { label: 'Customer Number', value: release.customerPhone },
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
          <Text style={styles.sectionTitle}>Release Schedule</Text>
          {[
            { label: 'Added', value: formatReleaseDateTime(release.addedAt) },
            { label: 'Pickup', value: formatReleaseDateTime(release.pickupAt) },
            {
              label: 'Released',
              value: formatReleaseDateTime(release.releasedAt),
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
          <Text style={styles.sectionTitle}>Preparation Done</Text>
          <View style={styles.preparationList}>
            {release.preparationDone.map((item, index) => (
              <View key={item.id} style={styles.preparationItem}>
                <View style={styles.preparationIndexWrap}>
                  <Text style={styles.preparationIndexText}>{index + 1}</Text>
                </View>

                <View style={styles.preparationCopy}>
                  <Text style={styles.preparationTitle}>{item.title}</Text>
                  <Text style={styles.preparationDate}>
                    {formatReleaseDateTime(item.completedAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Complete History Timeline</Text>
          <View style={styles.timelineList}>
            {release.timeline.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < release.timeline.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>

                <View style={styles.timelineEventCard}>
                  <Text style={styles.timelineTimestamp}>
                    {formatReleaseDateTime(item.timestamp)}
                  </Text>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDescription}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  exportButton: {
    marginTop: theme.spacing.base,
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
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
    fontFamily: theme.fonts.family.sans,
  },
  preparationList: {
    gap: theme.spacing.sm,
  },
  preparationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  preparationIndexWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySurface,
  },
  preparationIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    fontFamily: theme.fonts.family.sans,
  },
  preparationCopy: {
    flex: 1,
  },
  preparationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  preparationDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  timelineList: {
    gap: theme.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
    marginTop: 14,
    backgroundColor: theme.colors.primary,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 6,
    backgroundColor: theme.colors.primarySurfaceStrong,
  },
  timelineEventCard: {
    flex: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineTimestamp: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
    fontFamily: theme.fonts.family.sans,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.family.sans,
  },
  timelineDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.family.sans,
  },
  emptyStateWrap: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  emptyCard: {
    marginBottom: 0,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontFamily: theme.fonts.family.sans,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 21,
    fontFamily: theme.fonts.family.sans,
  },
});
