import { loadDriverAllocations } from './driver-allocation';
import { loadPreparationRecords } from './preparation';
import { loadTestDriveBookings } from './test-drive';
import { loadUnitAgentAllocations } from './unit-agent-allocation';
import { loadUserManagementRecords } from './users';
import { loadVehicleStocks } from './vehicle-stocks';

export const preloadMobileData = async () => {
  await loadUserManagementRecords();
  await loadVehicleStocks();
  await loadUnitAgentAllocations();
  await loadDriverAllocations();
  await loadPreparationRecords();
  await loadTestDriveBookings();
};
