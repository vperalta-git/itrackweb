import { Router } from 'express';
import { MANAGEMENT_ROLES, guardDriverAllocationCreate, guardDriverAllocationDeletion, guardDriverAllocationUpdate, guardShipmentVehicle, requireAssignedDriver, requireRoles, requireScopedRecord, resourceScope } from '../middleware/operationAccess.js';

import {
  createDriverAllocation,
  deleteDriverAllocation,
  getDriverAllocationById,
  listDriverAllocations,
  requestDriverAllocationCompletion,
  requestDriverAllocationStop,
  reviewDriverAllocationStopRequest,
  updateDriverAllocation,
  updateDriverAllocationLiveLocation,
} from '../controllers/driverAllocationsController.js';

const router = Router();
router.use(resourceScope('driverAllocations'));

router.get('/', listDriverAllocations);
router.post('/', requireRoles(...MANAGEMENT_ROLES), guardDriverAllocationCreate, guardShipmentVehicle, createDriverAllocation);
router.patch('/:id/live-location', requireScopedRecord('driverAllocations'), requireAssignedDriver, updateDriverAllocationLiveLocation);
router.post('/:id/completion-request', requireScopedRecord('driverAllocations'), requireAssignedDriver, requestDriverAllocationCompletion);
router.post('/:id/stop-request', requireScopedRecord('driverAllocations'), requireAssignedDriver, requestDriverAllocationStop);
router.patch('/:id/stop-request', requireRoles(...MANAGEMENT_ROLES), requireScopedRecord('driverAllocations'), reviewDriverAllocationStopRequest);
router.get('/:id', requireScopedRecord('driverAllocations'), getDriverAllocationById);
router.patch('/:id', requireRoles(...MANAGEMENT_ROLES, 'driver'), requireScopedRecord('driverAllocations'), guardDriverAllocationUpdate, guardShipmentVehicle, updateDriverAllocation);
router.delete('/:id', requireRoles(...MANAGEMENT_ROLES), requireScopedRecord('driverAllocations'), guardDriverAllocationDeletion, deleteDriverAllocation);

export default router;
