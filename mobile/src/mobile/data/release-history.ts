import { format } from 'date-fns';

import { PreparationStatus } from '@/src/mobile/types';
import { getPreparationRecords } from './preparation';
import { findUnitAgentAllocationByUnitId } from './unit-agent-allocation';
import { findVehicleStockById } from './vehicle-stocks';
import { getFirstValidDate, isDateValueValid } from './shared';

export type ReleaseHistoryPreparationItem = {
  id: string;
  title: string;
  completedAt: Date;
};

export type ReleaseHistoryTimelineItem = {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
};

export type ReleaseHistoryRecord = {
  id: string;
  conductionNumber: string;
  statusLabel: string;
  unitName: string;
  variation: string;
  bodyColor: string;
  addedAt: Date;
  pickupAt: Date;
  releasedAt: Date;
  assignedAgent: string;
  assignedDate: Date;
  customerName: string;
  customerPhone: string;
  preparationDone: ReleaseHistoryPreparationItem[];
  timeline: ReleaseHistoryTimelineItem[];
};

const getSortableTime = (value: Date) =>
  Number.isFinite(value.getTime()) ? value.getTime() : 0;

const resolveReleaseHistoryDate = (
  ...values: Array<Date | string | number | null | undefined>
) => getFirstValidDate(values);

export const getReleaseHistoryRecords = (): ReleaseHistoryRecord[] =>
  getPreparationRecords()
    .filter(
      (record) =>
        record.approvalStatus === 'approved' &&
        (record.status === PreparationStatus.COMPLETED ||
          record.status === PreparationStatus.READY_FOR_RELEASE)
    )
    .map((record) => {
      const unitAllocation = findUnitAgentAllocationByUnitId(record.vehicleId);
      const vehicle = findVehicleStockById(record.vehicleId);
      const createdAt = resolveReleaseHistoryDate(record.createdAt);
      const approvedAt = resolveReleaseHistoryDate(
        record.approvedAt,
        record.createdAt
      );
      const completedAt = resolveReleaseHistoryDate(
        record.readyForReleaseAt,
        record.completedAt,
        record.approvedAt,
        record.createdAt
      );
      const releasedAt = resolveReleaseHistoryDate(
        record.completedAt,
        record.readyForReleaseAt,
        record.approvedAt,
        record.createdAt
      );
      const assignedDate = resolveReleaseHistoryDate(
        unitAllocation?.createdAt,
        record.approvedAt,
        record.createdAt
      );
      const assignedAgent =
        unitAllocation?.salesAgentName || record.requestedByName;
      const completedChecklistItems = record.dispatcherChecklist.filter(
        (step) => step.completed
      );

      const preparationDone = completedChecklistItems.map((step, index) => ({
        id: `${record.id}-prep-${index + 1}`,
        title: step.label,
        completedAt,
      }));

      const timeline: ReleaseHistoryTimelineItem[] = [
        {
          id: `${record.id}-timeline-1`,
          timestamp: createdAt,
          title: 'Preparation requested',
          description: `${record.unitName} ${record.variation} was endorsed for preparation.`,
        },
        {
          id: `${record.id}-timeline-2`,
          timestamp: assignedDate,
          title: 'Agent assigned',
          description: `Assigned to sales agent ${assignedAgent}.`,
        },
        {
          id: `${record.id}-timeline-3`,
          timestamp: approvedAt,
          title: 'Preparation approved',
          description: `Approved by ${record.approvedByName ?? 'the approver'} for dispatcher processing.`,
        },
        {
          id: `${record.id}-timeline-4`,
          timestamp: completedAt,
          title: 'Preparation completed',
          description: 'Dispatcher checklist and requested services were completed.',
        },
      ];

      if (record.status === PreparationStatus.COMPLETED) {
        timeline.push({
          id: `${record.id}-timeline-5`,
          timestamp: releasedAt,
          title: 'Vehicle released',
          description: `Vehicle released to ${record.customerName}. Contact: ${record.customerContactNo}.`,
        });
      }

      return {
        id: `release-${record.id}`,
        conductionNumber: record.conductionNumber,
        statusLabel:
          record.status === PreparationStatus.COMPLETED
            ? 'Released'
            : 'Prepared',
        unitName: record.unitName,
        variation: record.variation,
        bodyColor: record.bodyColor,
        addedAt: vehicle?.createdAt ?? createdAt,
        pickupAt: approvedAt,
        releasedAt,
        assignedAgent,
        assignedDate,
        customerName: record.customerName,
        customerPhone: record.customerContactNo,
        preparationDone,
        timeline,
      };
    })
    .sort(
      (left, right) =>
        getSortableTime(right.releasedAt) - getSortableTime(left.releasedAt)
    );

export const getReleaseHistoryRecordById = (releaseId: string) =>
  getReleaseHistoryRecords().find((record) => record.id === releaseId);

export const formatReleaseDateTime = (value?: Date | string | null) =>
  isDateValueValid(value) ? format(getFirstValidDate([value]), 'yyyy-MM-dd HH:mm') : 'Unavailable';

export const getReleaseHistoryExportFileName = (
  record: ReleaseHistoryRecord
) => `release-history-${record.conductionNumber}.pdf`;

export const buildReleaseHistoryExportSummary = (
  record: ReleaseHistoryRecord
) => {
  const preparationLines = record.preparationDone
    .map(
      (item, index) =>
        `${index + 1}. ${item.title} (${formatReleaseDateTime(item.completedAt)})`
    )
    .join('\n');

  const timelineLines = record.timeline
    .map(
      (item) =>
        `- ${formatReleaseDateTime(item.timestamp)} | ${item.title}: ${item.description}`
    )
    .join('\n');

  return [
    'Release History',
    '',
    `Status: ${record.statusLabel}`,
    `Unit Name: ${record.unitName}`,
    `Variation: ${record.variation}`,
    `Conduction Number: ${record.conductionNumber}`,
    `Body Color: ${record.bodyColor}`,
    '',
    `Assigned Agent: ${record.assignedAgent}`,
    `Assigned Date: ${formatReleaseDateTime(record.assignedDate)}`,
    `Customer Name: ${record.customerName}`,
    `Customer Number: ${record.customerPhone}`,
    '',
    `Added: ${formatReleaseDateTime(record.addedAt)}`,
    `Pickup: ${formatReleaseDateTime(record.pickupAt)}`,
    `Released: ${formatReleaseDateTime(record.releasedAt)}`,
    '',
    'Preparation Done:',
    preparationLines || 'No preparation items recorded.',
    '',
    'Complete History Timeline:',
    timelineLines,
  ].join('\n');
};
