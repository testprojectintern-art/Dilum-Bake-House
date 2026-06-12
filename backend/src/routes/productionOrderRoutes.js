import express from 'express';
import {
    createProductionOrder, getProductionOrders, getProductionOrderById,
    approveProductionOrder, startProductionOrder, completeProductionOrder,
    cancelProductionOrder, holdProductionOrder, deleteProductionOrder,
} from '../controllers/productionOrderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createProductionOrderSchema, completeProductionSchema,
} from '../validators/productionOrderValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getProductionOrders)
    .post(
        authorize('admin', 'manager', 'employee'),
        validate(createProductionOrderSchema),
        createProductionOrder
    );

router
    .route('/:id')
    .get(getProductionOrderById)
    .delete(authorize('admin', 'manager'), deleteProductionOrder);

router.patch('/:id/approve',
    authorize('admin', 'manager', 'employee'),
    approveProductionOrder);

router.patch('/:id/start',
    authorize('admin', 'manager', 'employee'),
    startProductionOrder);

router.patch('/:id/complete',
    authorize('admin', 'manager', 'employee'),
    validate(completeProductionSchema),
    completeProductionOrder);

router.patch('/:id/hold',
    authorize('admin', 'manager', 'employee'),
    holdProductionOrder);

router.patch('/:id/cancel',
    authorize('admin', 'manager'),
    cancelProductionOrder);

export default router;