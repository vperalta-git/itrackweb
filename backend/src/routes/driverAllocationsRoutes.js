import { Router } from 'express';

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

router.get('/', listDriverAllocations);
router.post('/', createDriverAllocation);
router.patch('/:id/live-location', updateDriverAllocationLiveLocation);
router.post('/:id/completion-request', requestDriverAllocationCompletion);
router.post('/:id/stop-request', requestDriverAllocationStop);
router.patch('/:id/stop-request', reviewDriverAllocationStopRequest);
router.get('/:id', getDriverAllocationById);
router.patch('/:id', updateDriverAllocation);
router.delete('/:id', deleteDriverAllocation);

export default router;
