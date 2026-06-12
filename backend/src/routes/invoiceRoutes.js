import express from 'express';
import {
    createInvoice, createFromSalesOrder, getInvoices, getInvoiceById,
    getAgingSummary, changeInvoiceStatus, deleteInvoice,
} from '../controllers/invoiceController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
    createInvoiceSchema, updateInvoiceSchema, createFromSalesOrderSchema,
} from '../validators/invoiceValidator.js';

const router = express.Router();
router.use(protect);

router.get('/aging/summary', getAgingSummary);

router
    .route('/')
    .get(getInvoices)
    .post(
        authorize('admin', 'manager', 'accountant', 'cashier'),
        validate(createInvoiceSchema),
        createInvoice
    );

router.post(
    '/from-sales-order',
    authorize('admin', 'manager', 'accountant', 'cashier'),
    validate(createFromSalesOrderSchema),
    createFromSalesOrder
);

router
    .route('/:id')
    .get(getInvoiceById)
    .delete(authorize('admin', 'manager', 'accountant'), deleteInvoice);

router.patch(
    '/:id/status',
    authorize('admin', 'manager', 'accountant', 'cashier'),
    changeInvoiceStatus
);

export default router;