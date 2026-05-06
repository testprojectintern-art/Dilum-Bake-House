import express from 'express';
import { createCheque, getCheques, updateChequeStatus } from '../controllers/chequeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getCheques)
    .post(protect, createCheque);

router.route('/:id/status')
    .put(protect, updateChequeStatus);

export default router;
