import express from 'express';
import {
    getDashboardKpis, getRevenueChart, getTopProducts, getTopCustomers,
} from '../controllers/dashboardController.js';
import {
    getSalesSummary, getSalesByProduct, getSalesByCustomer, getSalesTrend,
} from '../controllers/reports/salesReportsController.js';
import {
    getStockValuation, getStockMovement, getSlowFastMovers, getLowStockReport,
} from '../controllers/reports/inventoryReportsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getProductionSummary, getProductionByProduct, getProductionWastage,
} from '../controllers/reports/productionReportsController.js';
import {
    getReturnsSummary, getDamagesReport,
} from '../controllers/reports/returnsReportsController.js';
import { getFinancialSnapshot } from '../controllers/reports/financialReportsController.js';
import { getNetProfitAnalysis } from '../controllers/reports/netProfitController.js';
import {
    getHeadcountReport, getAttendanceReport, getLeavePatternsReport, getPayrollSummaryReport,
} from '../controllers/reports/hrReportsController.js';
import { getPredictiveAnalytics } from '../controllers/reports/aiPredictiveController.js';

const router = express.Router();
router.use(protect);

const fullAccess = authorize('admin', 'manager', 'accountant');
const withEmployee = authorize('admin', 'manager', 'accountant', 'employee');

// Production (accessible to admin, manager, accountant, employee)
router.get('/production/summary', withEmployee, getProductionSummary);
router.get('/production/by-product', withEmployee, getProductionByProduct);
router.get('/production/wastage', withEmployee, getProductionWastage);

// Returns & Damages
router.get('/returns/summary', fullAccess, getReturnsSummary);
router.get('/damages/summary', fullAccess, getDamagesReport);

// Financial
router.get('/financial/snapshot', fullAccess, getFinancialSnapshot);
router.get('/financial/net-profit-analysis', fullAccess, getNetProfitAnalysis);
router.get('/predictive/analytics', fullAccess, getPredictiveAnalytics);

// HR
router.get('/hr/headcount', fullAccess, getHeadcountReport);
router.get('/hr/attendance-summary', fullAccess, getAttendanceReport);
router.get('/hr/leave-patterns', fullAccess, getLeavePatternsReport);
router.get('/hr/payroll-summary', fullAccess, getPayrollSummaryReport);

// Dashboard
router.get('/dashboard/kpis', fullAccess, getDashboardKpis);
router.get('/dashboard/revenue-chart', fullAccess, getRevenueChart);
router.get('/dashboard/top-products', fullAccess, getTopProducts);
router.get('/dashboard/top-customers', fullAccess, getTopCustomers);

// Sales reports
router.get('/sales/summary', fullAccess, getSalesSummary);
router.get('/sales/by-product', fullAccess, getSalesByProduct);
router.get('/sales/by-customer', fullAccess, getSalesByCustomer);
router.get('/sales/trend', fullAccess, getSalesTrend);

// Inventory reports
router.get('/inventory/valuation', fullAccess, getStockValuation);
router.get('/inventory/movement', fullAccess, getStockMovement);
router.get('/inventory/slow-fast-movers', fullAccess, getSlowFastMovers);
router.get('/inventory/low-stock', fullAccess, getLowStockReport);

export default router;