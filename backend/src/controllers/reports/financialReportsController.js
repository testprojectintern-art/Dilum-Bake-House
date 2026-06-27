import asyncHandler from 'express-async-handler';
import Invoice from '../../models/Invoice.js';
import Bill from '../../models/Bill.js';
import Payment from '../../models/Payment.js';
import Customer from '../../models/Customer.js';
import Expense from '../../models/Expense.js';
import CustomerReturn from '../../models/CustomerReturn.js';
import { updateInvoiceAging } from '../invoiceController.js';
import { updateBillAging } from '../billController.js';

/**
 * GET /api/reports/financial/snapshot
 * Revenue vs expenses, A/R + A/P, collection efficiency for a period
 */
export const getFinancialSnapshot = asyncHandler(async (req, res) => {
    await updateInvoiceAging();
    await updateBillAging();
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [revenue, bills, generalExpenses, collected, paymentsPaid, generalExpensesPaid, arTotal, apTotal, customerReturns] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, status: { $nin: ['draft', 'void', 'cancelled'] }, invoiceDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: { $ne: 'cancelled' }, date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'received', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: 'paid', date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
            {
                $group: {
                    _id: null,
                    current: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', 'current'] }, '$balanceDue', 0]
                        }
                    },
                    b1_30: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '1_30'] }, '$balanceDue', 0]
                        }
                    },
                    b31_60: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '31_60'] }, '$balanceDue', 0]
                        }
                    },
                    b61_90: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '61_90'] }, '$balanceDue', 0]
                        }
                    },
                    b91_plus: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '91_plus'] }, '$balanceDue', 0]
                        }
                    },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
            {
                $group: {
                    _id: null,
                    current: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', 'current'] }, '$balanceDue', 0]
                        }
                    },
                    b1_30: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '1_30'] }, '$balanceDue', 0]
                        }
                    },
                    b31_60: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '31_60'] }, '$balanceDue', 0]
                        }
                    },
                    b61_90: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '61_90'] }, '$balanceDue', 0]
                        }
                    },
                    b91_plus: {
                        $sum: {
                            $cond: [{ $eq: ['$agingBucket', '91_plus'] }, '$balanceDue', 0]
                        }
                    },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, status: { $in: ['processed', 'completed'] }, requestDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$netRefundAmount' } } }
        ])
    ]);

    const grossRevenueTotal = revenue[0]?.total || 0;
    const returnsTotal = customerReturns[0]?.total || 0;
    const revenueTotal = grossRevenueTotal - returnsTotal;
    
    const billsTotal = bills[0]?.total || 0;
    const generalExpensesTotal = generalExpenses[0]?.total || 0;
    const expensesTotal = billsTotal + generalExpensesTotal;

    const collectedTotal = collected[0]?.total || 0;
    const paymentsPaidTotal = paymentsPaid[0]?.total || 0;
    const generalExpensesPaidTotal = generalExpensesPaid[0]?.total || 0;
    const paidTotal = paymentsPaidTotal + generalExpensesPaidTotal;

    res.json({
        success: true,
        data: {
            period: { start, end },
            revenue: +revenueTotal.toFixed(2),
            expenses: +expensesTotal.toFixed(2),
            grossProfit: +(revenueTotal - expensesTotal).toFixed(2),
            collected: +collectedTotal.toFixed(2),
            paid: +paidTotal.toFixed(2),
            netCashFlow: +(collectedTotal - paidTotal).toFixed(2),
            collectionEfficiency: revenueTotal > 0 ? +((collectedTotal / revenueTotal) * 100).toFixed(1) : 0,
            accountsReceivable: arTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
            accountsPayable: apTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
        },
    });
});