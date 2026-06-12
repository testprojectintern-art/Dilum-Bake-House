import express from 'express';
import {
    processPayroll, getPayrolls, getPayrollById,
    approvePayroll, markPayrollPaid,
    getEmployeePayslip, previewPayslip, getMyPayslips,
} from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
const hrOnly = authorize('admin', 'manager', 'accountant');

router.post('/process', hrOnly, processPayroll);
router.post('/preview', hrOnly, previewPayslip);
router.get('/my-payslips', getMyPayslips);         // must be before /:id
router.get('/', hrOnly, getPayrolls);
router.get('/:id', hrOnly, getPayrollById);
router.patch('/:id/approve', hrOnly, approvePayroll);
router.patch('/:id/mark-paid', hrOnly, markPayrollPaid);
router.get('/:payrollId/payslip/:employeeId', getEmployeePayslip);

export default router;