import express from 'express';
import {
    createPayment, getPayments, getPaymentById, deletePayment
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getPayments)
    .post(authorize('admin', 'manager', 'accountant'), createPayment);

router.route('/:id')
    .get(getPaymentById)
    .delete(authorize('admin', 'manager', 'accountant'), deletePayment);

export default router;