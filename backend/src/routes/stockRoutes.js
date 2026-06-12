import express from 'express';
import {
    getStockItems, getStockByProduct, getStockMovements,
    createOpeningStock, transferStock, adjustStock,
    getReservations,
} from '../controllers/stockController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/', getStockItems);
router.get('/movements', getStockMovements);
router.get('/reservations', getReservations);
router.get('/by-product/:productId', getStockByProduct);

router.post('/opening', authorize('admin', 'manager'), createOpeningStock);
router.post('/transfer', authorize('admin', 'manager'), transferStock);
router.post('/adjustment', authorize('admin', 'manager'), adjustStock);

export default router;