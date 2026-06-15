import express from 'express';
import { saveTarget, getTargets, deleteTarget, getTargetsProgress } from '../controllers/targetController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Only admins, managers and accountants can manage targets
const fullAccess = authorize('admin', 'manager', 'accountant');

router.route('/')
    .get(getTargets)
    .post(fullAccess, saveTarget);

router.route('/progress')
    .get(getTargetsProgress);

router.route('/:id')
    .delete(fullAccess, deleteTarget);

export default router;
