import express from 'express';
import {
    createDamage, getDamages, getDamageById, writeOffDamage, getDamageSummary,
} from '../controllers/damageController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/summary', getDamageSummary);

router.route('/')
    .get(getDamages)
    .post(authorize('admin', 'manager', 'employee'), createDamage);

router.route('/:id').get(getDamageById);
router.patch('/:id/write-off', authorize('admin', 'manager'), writeOffDamage);

export default router;