import express from 'express';
import {
    getProducts,
    createProduct,
    deleteProduct,
    getShops,
    createShop,
    suggestShops,
    getStructures,
    getStructureById,
    createStructure,
    updateStructure,
    deleteStructure,
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getBakeryDashboard,
    getNuwaraEliyaDeliveries,
    getLatestNuwaraEliyaOutstanding,
    getNuwaraEliyaDeliveryById,
    createNuwaraEliyaDelivery,
    updateNuwaraEliyaDelivery,
    deleteNuwaraEliyaDelivery
} from '../controllers/bakeryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All bakery routes require authentication
router.use(protect);

// Dashboard
router.route('/dashboard')
    .get(getBakeryDashboard);

// Products
router.route('/products')
    .get(getProducts)
    .post(createProduct);
router.route('/products/:id')
    .delete(deleteProduct);

// Shops
router.route('/shops')
    .get(getShops)
    .post(createShop);
router.route('/shops/suggest')
    .get(suggestShops);

// Structures
router.route('/structures')
    .get(getStructures)
    .post(createStructure);
router.route('/structures/:id')
    .get(getStructureById)
    .put(updateStructure)
    .delete(deleteStructure);

// Invoices
router.route('/invoices')
    .get(getInvoices)
    .post(createInvoice);
router.route('/invoices/:id')
    .get(getInvoiceById)
    .put(updateInvoice)
    .delete(deleteInvoice);

// Nuwara Eliya Delivery Consignments
router.route('/nuwara-eliya')
    .get(getNuwaraEliyaDeliveries)
    .post(createNuwaraEliyaDelivery);
router.route('/nuwara-eliya/latest')
    .get(getLatestNuwaraEliyaOutstanding);
router.route('/nuwara-eliya/:id')
    .get(getNuwaraEliyaDeliveryById)
    .put(updateNuwaraEliyaDelivery)
    .delete(deleteNuwaraEliyaDelivery);

export default router;
