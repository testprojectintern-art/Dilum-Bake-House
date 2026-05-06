import express from 'express';
import { createBankAccount, getBankAccounts, updateBankAccount, getBankAccountById, deleteBankAccount } from '../controllers/bankAccountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getBankAccounts)
    .post(protect, createBankAccount);

router.route('/:id')
    .get(protect, getBankAccountById)
    .put(protect, updateBankAccount)
    .delete(protect, deleteBankAccount);

export default router;
