import express from 'express';
import {
    createBom, getBoms, getBomById, updateBom, deleteBom,
    checkMaterialAvailability,
} from '../controllers/bomController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createBomSchema, updateBomSchema } from '../validators/bomValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getBoms)
    .post(authorize('admin', 'manager', 'employee'), validate(createBomSchema), createBom);

router
    .route('/:id')
    .get(getBomById)
    .put(authorize('admin', 'manager', 'employee'), validate(updateBomSchema), updateBom)
    .delete(authorize('admin', 'manager'), deleteBom);

router.get('/:id/check-availability', checkMaterialAvailability);

export default router;