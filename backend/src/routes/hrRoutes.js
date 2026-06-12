import express from 'express';
import {
    createDepartment, getDepartments, updateDepartment, deleteDepartment,
    createDesignation, getDesignations, updateDesignation, deleteDesignation,
    createEmployee, getEmployees, getEmployeeById, getEmployeeMe, updateEmployee, deleteEmployee,
    createShift, getShifts, updateShift, deleteShift,
    markAttendance, getAttendance, bulkMarkAttendance,
    createLeaveRequest, getLeaveRequests, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
    createHoliday, getHolidays, updateHoliday, deleteHoliday,
    createSalaryStructure, getSalaryStructures, updateSalaryStructure, deleteSalaryStructure,
} from '../controllers/hrController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

const hrOnly = authorize('admin', 'manager');

// Departments
router.route('/departments').get(getDepartments).post(hrOnly, createDepartment);
router.route('/departments/:id').put(hrOnly, updateDepartment).delete(hrOnly, deleteDepartment);

// Designations
router.route('/designations').get(getDesignations).post(hrOnly, createDesignation);
router.route('/designations/:id').put(hrOnly, updateDesignation).delete(hrOnly, deleteDesignation);

// Employees
router.get('/employees/me', getEmployeeMe);             // must be before /:id
router.route('/employees').get(getEmployees).post(hrOnly, createEmployee);
router.route('/employees/:id').get(getEmployeeById).put(hrOnly, updateEmployee).delete(hrOnly, deleteEmployee);

// Shifts
router.route('/shifts').get(getShifts).post(hrOnly, createShift);
router.route('/shifts/:id').put(hrOnly, updateShift).delete(hrOnly, deleteShift);

// Attendance
router.route('/attendance').get(getAttendance).post(hrOnly, markAttendance);
router.post('/attendance/bulk', hrOnly, bulkMarkAttendance);

// Leave
router.route('/leaves').get(getLeaveRequests).post(createLeaveRequest);
router.patch('/leaves/:id/approve', hrOnly, approveLeaveRequest);
router.patch('/leaves/:id/reject', hrOnly, rejectLeaveRequest);
router.patch('/leaves/:id/cancel', cancelLeaveRequest);

// Holidays
router.route('/holidays').get(getHolidays).post(hrOnly, createHoliday);
router.route('/holidays/:id').put(hrOnly, updateHoliday).delete(hrOnly, deleteHoliday);

// Salary structures
router.route('/salary-structures').get(getSalaryStructures).post(hrOnly, createSalaryStructure);
router.route('/salary-structures/:id').put(hrOnly, updateSalaryStructure).delete(hrOnly, deleteSalaryStructure);

export default router;