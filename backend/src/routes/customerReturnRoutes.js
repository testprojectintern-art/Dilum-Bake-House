import express from 'express';
import {
    createReturn, getReturns, getReturnById,
    approveReturn, rejectReturn, receiveReturn,
    processReturn, issueCreditNote, completeReturn,
    getEligibleOrders,
} from '../controllers/customerReturnController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(getReturns)
    .post(authorize('admin', 'manager', 'cashier', 'accountant'), createReturn);

router.route('/:id').get(getReturnById);

router.patch('/:id/approve', authorize('admin', 'manager'), approveReturn);
router.patch('/:id/reject', authorize('admin', 'manager'), rejectReturn);
router.patch('/:id/receive', authorize('admin', 'manager', 'employee'), receiveReturn);
router.patch('/:id/process', authorize('admin', 'manager', 'employee'), processReturn);
router.patch('/:id/issue-credit-note', authorize('admin', 'manager', 'accountant'), issueCreditNote);
router.patch('/:id/complete', authorize('admin', 'manager', 'accountant'), completeReturn);
router.get('/eligible-orders', getEligibleOrders);

export default router;