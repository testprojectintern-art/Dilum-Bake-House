import express from 'express';
import { createFundTransfer, getFundTransfers, deleteFundTransfer } from '../controllers/fundTransferController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getFundTransfers)
    .post(protect, createFundTransfer);

router.route('/:id')
    .delete(protect, deleteFundTransfer);

export default router;
