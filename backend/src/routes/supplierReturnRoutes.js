import express from 'express';
import {
    createSupplierReturn, getSupplierReturns, getSupplierReturnById,
    sendSupplierReturn, recordSupplierCredit,
} from '../controllers/supplierReturnController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.route('/')
    .get(getSupplierReturns)
    .post(authorize('admin', 'manager', 'accountant'), createSupplierReturn);

router.route('/:id').get(getSupplierReturnById);
router.patch('/:id/send', authorize('admin', 'manager', 'accountant'), sendSupplierReturn);
router.patch('/:id/record-credit', authorize('admin', 'manager', 'accountant'), recordSupplierCredit);

export default router;