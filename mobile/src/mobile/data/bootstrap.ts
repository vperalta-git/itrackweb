import { loadDriverAllocations } from './driver-allocation';
import { loadPreparationRecords } from './preparation';
import { loadTestDriveBookings } from './test-drive';
import { loadUnitAgentAllocations } from './unit-agent-allocation';
import { loadUserAuditEventRecords } from './user-audit-events';
import { loadUserManagementRecords } from './users';
import { loadVehicleStocks } from './vehicle-stocks';

const PRELOAD_TASKS = [
  {
    label: 'users',
    load: loadUserManagementRecords,
  },
  {
    label: 'user-audit-events',
    load: loadUserAuditEventRecords,
  },
  {
    label: 'vehicles',
    load: loadVehicleStocks,
  },
  {
    label: 'unit-agent-allocations',
    load: loadUnitAgentAllocations,
  },
  {
    label: 'driver-allocations',
    load: loadDriverAllocations,
  },
  {
    label: 'preparations',
    load: loadPreparationRecords,
  },
  {
    label: 'test-drive-bookings',
    load: loadTestDriveBookings,
  },
] as const;

export const preloadMobileData = async () => {
  const settledResults = await Promise.allSettled(
    PRELOAD_TASKS.map((task) => task.load())
  );
  const failures = settledResults.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return [];
    }

    const reason =
      result.reason instanceof Error && result.reason.message.trim()
        ? result.reason.message.trim()
        : 'Unknown preload error.';

    return [`${PRELOAD_TASKS[index].label}: ${reason}`];
  });

  if (failures.length) {
    console.warn(
      '[mobile-bootstrap] Some startup data failed to preload:',
      failures.join(' | ')
    );
  }
};
