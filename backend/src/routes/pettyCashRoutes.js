import express from 'express';
import {
    recordPettyCashTransaction,
    getPettyCashTransactions,
    getPettyCashBalance,
    deletePettyCashTransaction
} from '../controllers/pettyCashController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Only admins, managers and accountants can manage petty cash
const fullAccess = authorize('admin', 'manager', 'accountant');

router.route('/')
    .get(getPettyCashTransactions)
    .post(fullAccess, recordPettyCashTransaction);

router.route('/balance')
    .get(getPettyCashBalance);

router.route('/:id')
    .delete(fullAccess, deletePettyCashTransaction);

export default router;
