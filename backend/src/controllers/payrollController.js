import asyncHandler from 'express-async-handler';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Holiday from '../models/Holiday.js';
import { calculatePayslip } from '../services/payrollCalculator.js';
import SalesOrder from '../models/SalesOrder.js';
import Expense from '../models/Expense.js';

/**
 * Get total sales commission for employee in a month
 */
const getEmployeeCommission = async (userId, year, month, rate = 0) => {
    if (!userId || rate <= 0) return 0;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    // Only count invoiced/completed orders for commission
    const orders = await SalesOrder.find({
        salesRepId: userId,
        status: { $in: ['invoiced', 'completed'] },
        orderDate: { $gte: start, $lte: end },
    });

    const totalSales = orders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);
    return +(totalSales * (rate / 100)).toFixed(2);
};

/**
 * Helper: count working days in a month (excluding Sundays and holidays)
 */
const countWorkingDays = async (year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const holidays = await Holiday.find({
        date: { $gte: start, $lte: end },
        type: { $in: ['public', 'national', 'poya', 'religious'] },
    }).select('date');

    const holidayDates = new Set(holidays.map((h) => new Date(h.date).toDateString()));

    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0) continue; // Skip Sundays
        if (holidayDates.has(d.toDateString())) continue;
        count++;
    }
    return count;
};

/**
 * Get attendance summary for employee in a month
 */
const getEmployeeMonthAttendance = async (employeeId, year, month) => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
        employeeId,
        date: { $gte: start, $lte: end },
    });

    let daysPresent = 0;
    let daysAbsent = 0;
    let halfDays = 0;
    let overtimeMinutes = 0;

    records.forEach((r) => {
        if (r.status === 'present' || r.status === 'late') daysPresent++;
        else if (r.status === 'half_day') halfDays++;
        else if (r.status === 'absent') daysAbsent++;
        overtimeMinutes += r.overtimeMinutes || 0;
    });

    // Get approved leaves in this period
    const approvedLeaves = await LeaveRequest.find({
        employeeId, status: 'approved',
        fromDate: { $lte: end },
        toDate: { $gte: start },
    });

    let leaveDays = 0;
    let unpaidLeaveDays = 0;
    approvedLeaves.forEach((l) => {
        // Calculate overlap
        const lFrom = new Date(Math.max(l.fromDate, start));
        const lTo = new Date(Math.min(l.toDate, end));
        const overlapDays = Math.max(0, Math.floor((lTo - lFrom) / (1000 * 60 * 60 * 24)) + 1);
        const actualDays = l.isHalfDay ? Math.min(0.5, overlapDays) : overlapDays;
        leaveDays += actualDays;
        if (l.leaveType === 'unpaid') unpaidLeaveDays += actualDays;
    });

    return {
        daysPresent: daysPresent + halfDays * 0.5,
        daysAbsent,
        leaveDays,
        unpaidLeaveDays,
        overtimeHours: +(overtimeMinutes / 60).toFixed(2),
    };
};

/**
 * POST /api/payroll/process
 * Process monthly payroll — generate payslips for all active employees
 */
export const processPayroll = asyncHandler(async (req, res) => {
    const { periodMonth, periodYear, includeEmployeeIds, overtimeRatePerHour = 0 } = req.body;

    if (!periodMonth || !periodYear) {
        res.status(400); throw new Error('periodMonth and periodYear are required');
    }

    // Check if payroll for this period already exists
    const existing = await Payroll.findOne({ periodMonth, periodYear, deletedAt: null });
    if (existing && existing.status !== 'draft') {
        res.status(400); throw new Error(`Payroll for ${periodMonth}/${periodYear} already ${existing.status}`);
    }

    // Delete old draft if exists
    if (existing) await Payroll.deleteOne({ _id: existing._id });

    // Get active employees
    const filter = { status: { $in: ['active', 'on_leave', 'probation'] } };
    if (includeEmployeeIds?.length) filter._id = { $in: includeEmployeeIds };

    const employees = await Employee.find(filter).populate('salaryStructureId');
    if (employees.length === 0) {
        res.status(400); throw new Error('No active employees found for payroll');
    }

    const workingDays = await countWorkingDays(periodYear, periodMonth);

    const payslips = [];

    for (const emp of employees) {
        if (!emp.basicSalary || emp.basicSalary <= 0) continue; // skip if no basic salary set

        const [attendance, commission] = await Promise.all([
            getEmployeeMonthAttendance(emp._id, periodYear, periodMonth),
            getEmployeeCommission(emp.userId, periodYear, periodMonth, emp.commissionRate || 0),
        ]);

        // Build earnings from salary structure
        const structureEarnings = [];
        if (emp.salaryStructureId?.components) {
            emp.salaryStructureId.components
                .filter((c) => c.type === 'earning')
                .forEach((c) => {
                    let amount = 0;
                    if (c.calculationType === 'fixed') amount = c.amount || 0;
                    else if (c.calculationType === 'percentage_of_basic') amount = (emp.basicSalary * (c.percentage || 0)) / 100;
                    structureEarnings.push({
                        name: c.name,
                        amount,
                        type: 'allowance',
                        isTaxable: c.isTaxable !== false,
                        isEpfable: true,
                    });
                });
        }

        // Add sales commission if any
        if (commission > 0) {
            structureEarnings.push({
                name: 'Sales Commission',
                amount: commission,
                type: 'bonus',
                isTaxable: true,
                isEpfable: false,
            });
        }

        const calc = calculatePayslip({
            basicSalary: emp.basicSalary,
            earnings: structureEarnings,
            otherDeductions: [], // advances/loans can be added per-employee later
            attendance: {
                workingDays,
                daysPresent: attendance.daysPresent,
                unpaidLeaveDays: attendance.unpaidLeaveDays,
                overtimeHours: attendance.overtimeHours,
            },
            overtimeRate: overtimeRatePerHour,
        });

        payslips.push({
            employeeId: emp._id,
            employeeCode: emp.employeeCode,
            employeeName: emp.fullName,
            workingDays,
            daysPresent: attendance.daysPresent,
            daysAbsent: attendance.daysAbsent,
            leaveDays: attendance.leaveDays,
            unpaidLeaveDays: attendance.unpaidLeaveDays,
            overtimeHours: attendance.overtimeHours,
            basicSalary: emp.basicSalary,
            earnings: calc.earnings,
            grossEarnings: calc.grossEarnings,
            deductions: calc.deductions,
            totalDeductions: calc.totalDeductions,
            epfEmployeeContribution: calc.epfEmployeeContribution,
            epfEmployerContribution: calc.epfEmployerContribution,
            etfContribution: calc.etfContribution,
            apitAmount: calc.apitAmount,
            netPay: calc.netPay,
            paymentStatus: 'pending',
        });
    }

    const periodStartDate = new Date(periodYear, periodMonth - 1, 1);
    const periodEndDate = new Date(periodYear, periodMonth, 0);

    const payroll = new Payroll({
        periodMonth, periodYear, periodStartDate, periodEndDate,
        payslips,
        status: 'processed',
        processedAt: new Date(),
        processedBy: req.user._id,
        createdBy: req.user._id,
    });
    await payroll.save();

    res.status(201).json({ success: true, data: payroll });
});

export const getPayrolls = asyncHandler(async (req, res) => {
    const { year, status, page = 1, limit = 12 } = req.query;
    const filter = {};
    if (year) filter.periodYear = Number(year);
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [list, total] = await Promise.all([
        Payroll.find(filter)
            .select('-payslips') // exclude payslips for list view
            .sort({ periodYear: -1, periodMonth: -1 })
            .skip(skip).limit(Number(limit)),
        Payroll.countDocuments(filter),
    ]);

    res.json({
        success: true, count: list.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: list,
    });
});

export const getPayrollById = asyncHandler(async (req, res) => {
    const p = await Payroll.findById(req.params.id)
        .populate('processedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');
    if (!p) { res.status(404); throw new Error('Payroll not found'); }
    res.json({ success: true, data: p });
});

export const approvePayroll = asyncHandler(async (req, res) => {
    const p = await Payroll.findById(req.params.id);
    if (!p) { res.status(404); throw new Error('Payroll not found'); }
    if (p.status !== 'processed') {
        res.status(400); throw new Error(`Cannot approve payroll with status '${p.status}'`);
    }
    p.status = 'approved';
    p.approvedBy = req.user._id;
    p.approvedAt = new Date();
    await p.save();
    res.json({ success: true, data: p });
});

export const markPayrollPaid = asyncHandler(async (req, res) => {
    const p = await Payroll.findById(req.params.id);
    if (!p) { res.status(404); throw new Error('Payroll not found'); }
    if (p.status !== 'approved') {
        res.status(400); throw new Error('Payroll must be approved before marking paid');
    }
    p.status = 'paid';
    p.paidAt = new Date();
    p.payslips.forEach((ps) => {
        ps.paymentStatus = 'paid';
        ps.paidAt = new Date();
    });
    await p.save();

    // Auto-create Expense record for salary payout
    try {
        const totalNetPay = p.payslips.reduce((sum, ps) => sum + (ps.netPay || 0), 0);
        if (totalNetPay > 0) {
            await Expense.create({
                date: p.paidAt || new Date(),
                category: 'Salary',
                amount: +totalNetPay.toFixed(2),
                paymentMethod: 'bank_transfer',
                reference: p.payrollNumber,
                description: `Payroll ${p.payrollNumber} — ${p.periodMonth}/${p.periodYear} (${p.payslips.length} employees)`,
                status: 'paid',
                createdBy: req.user._id,
            });
        }
    } catch (expErr) {
        console.warn('Could not auto-create salary expense:', expErr.message);
    }

    res.json({ success: true, data: p });
});


export const getEmployeePayslip = asyncHandler(async (req, res) => {
    const { payrollId, employeeId } = req.params;

    // Restrict cashier & employee roles from viewing other employees' payslips
    if (['employee', 'cashier'].includes(req.user.role)) {
        const emp = await Employee.findOne({ userId: req.user._id });
        if (!emp || emp._id.toString() !== employeeId) {
            res.status(403);
            throw new Error('You are not authorized to view this payslip');
        }
    }

    const p = await Payroll.findById(payrollId);
    if (!p) { res.status(404); throw new Error('Payroll not found'); }

    const payslip = p.payslips.find((ps) => ps.employeeId.toString() === employeeId);
    if (!payslip) { res.status(404); throw new Error('Payslip not found for this employee'); }

    const employee = await Employee.findById(employeeId).populate('departmentId designationId');

    res.json({
        success: true,
        data: {
            payslip,
            payroll: {
                payrollNumber: p.payrollNumber,
                periodMonth: p.periodMonth,
                periodYear: p.periodYear,
                periodStartDate: p.periodStartDate,
                periodEndDate: p.periodEndDate,
            },
            employee: {
                firstName: employee?.firstName,
                lastName: employee?.lastName,
                employeeCode: employee?.employeeCode,
                department: employee?.departmentId?.name,
                designation: employee?.designationId?.name,
                epfNumber: employee?.epfNumber,
                bankDetails: employee?.bankDetails,
            },
        },
    });
});

/**
 * Preview calculation for a single employee (doesn't save)
 */
export const previewPayslip = asyncHandler(async (req, res) => {
    const { employeeId, periodMonth, periodYear, overtimeRatePerHour = 0 } = req.body;

    const emp = await Employee.findById(employeeId).populate('salaryStructureId');
    if (!emp) { res.status(404); throw new Error('Employee not found'); }

    const workingDays = await countWorkingDays(periodYear, periodMonth);
    const [attendance, commission] = await Promise.all([
        getEmployeeMonthAttendance(emp._id, periodYear, periodMonth),
        getEmployeeCommission(emp.userId, periodYear, periodMonth, emp.commissionRate || 0),
    ]);

    const structureEarnings = [];
    if (emp.salaryStructureId?.components) {
        emp.salaryStructureId.components
            .filter((c) => c.type === 'earning')
            .forEach((c) => {
                let amount = 0;
                if (c.calculationType === 'fixed') amount = c.amount || 0;
                else if (c.calculationType === 'percentage_of_basic') amount = (emp.basicSalary * (c.percentage || 0)) / 100;
                structureEarnings.push({ name: c.name, amount });
            });
    }

    if (commission > 0) {
        structureEarnings.push({ name: 'Sales Commission', amount: commission });
    }

    const calc = calculatePayslip({
        basicSalary: emp.basicSalary,
        earnings: structureEarnings,
        attendance: {
            workingDays,
            daysPresent: attendance.daysPresent,
            unpaidLeaveDays: attendance.unpaidLeaveDays,
            overtimeHours: attendance.overtimeHours,
        },
        overtimeRate: overtimeRatePerHour,
    });

    res.json({
        success: true,
        data: { employee: emp, workingDays, attendance, calculation: calc },
    });
});

/**
 * @desc    Get all payslips for the currently logged-in user
 * @route   GET /api/payroll/my-payslips
 * @access  Private (all roles with an employee profile)
 */
export const getMyPayslips = asyncHandler(async (req, res) => {
    // Find the employee record linked to this user
    const emp = await Employee.findOne({ userId: req.user._id });
    if (!emp) {
        return res.json({ success: true, count: 0, data: [] });
    }

    // Find all approved/paid payrolls that contain this employee's payslip
    const payrolls = await Payroll.find({
        status: { $in: ['approved', 'paid', 'closed'] },
        'payslips.employeeId': emp._id,
    })
        .select('payrollNumber periodMonth periodYear periodStartDate periodEndDate status paidAt payslips')
        .sort({ periodYear: -1, periodMonth: -1 })
        .limit(24); // last 2 years

    const myPayslips = payrolls
        .map((p) => {
            const ps = p.payslips.find((s) => s.employeeId.toString() === emp._id.toString());
            if (!ps) return null;
            return {
                payrollId: p._id,
                payrollNumber: p.payrollNumber,
                periodMonth: p.periodMonth,
                periodYear: p.periodYear,
                periodStartDate: p.periodStartDate,
                periodEndDate: p.periodEndDate,
                payrollStatus: p.status,
                paidAt: p.paidAt,
                employeeId: ps.employeeId,
                employeeName: ps.employeeName,
                basicSalary: ps.basicSalary,
                grossEarnings: ps.grossEarnings,
                totalDeductions: ps.totalDeductions,
                netPay: ps.netPay,
                paymentStatus: ps.paymentStatus,
                epfEmployeeContribution: ps.epfEmployeeContribution,
                epfEmployerContribution: ps.epfEmployerContribution,
                etfContribution: ps.etfContribution,
                workingDays: ps.workingDays,
                daysPresent: ps.daysPresent,
                daysAbsent: ps.daysAbsent,
            };
        })
        .filter(Boolean);

    res.json({ success: true, count: myPayslips.length, data: myPayslips });
});