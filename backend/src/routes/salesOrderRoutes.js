import express from 'express';
import {
    createSalesOrder, getSalesOrders, getSalesOrderById,
    updateSalesOrder, changeSalesOrderStatus, deleteSalesOrder,
} from '../controllers/salesOrderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validators/salesOrderValidator.js';

const router = express.Router();
router.use(protect);

router
    .route('/')
    .get(getSalesOrders)
    .post(
        authorize('admin', 'manager', 'cashier'),
        validate(createSalesOrderSchema),
        createSalesOrder
    );

router
    .route('/:id')
    .get(getSalesOrderById)
    .put(
        authorize('admin', 'manager', 'cashier'),
        validate(updateSalesOrderSchema),
        updateSalesOrder
    )
    .delete(authorize('admin', 'manager', 'cashier'), deleteSalesOrder);

router.patch(
    '/:id/status',
    authorize('admin', 'manager', 'cashier', 'accountant'),
    changeSalesOrderStatus
);

export default router;