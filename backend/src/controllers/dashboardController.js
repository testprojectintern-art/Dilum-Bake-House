import asyncHandler from 'express-async-handler';
import SalesOrder from '../models/SalesOrder.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import StockItem from '../models/StockItem.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Bill from '../models/Bill.js';
import ProductionOrder from '../models/ProductionOrder.js';
import CustomerReturn from '../models/CustomerReturn.js';
import Expense from '../models/Expense.js';
import { updateInvoiceAging } from './invoiceController.js';
import { updateBillAging } from './billController.js';

/**
 * GET /api/dashboard/kpis
 * Main admin dashboard key metrics
 */
export const getDashboardKpis = asyncHandler(async (req, res) => {
    await updateInvoiceAging();
    await updateBillAging();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(today); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

    // Revenue (invoiced amount this month vs last month)
    const [
        currentMonthInvoices, lastMonthInvoices,
        currentMonthBills, lastMonthBills,
        currentMonthExpenses, lastMonthExpenses,
        currentMonthIn, lastMonthIn,
        currentMonthOut, lastMonthOut,
        currentMonthExpensesPaid, lastMonthExpensesPaid,
        currentMonthReturns, lastMonthReturns
    ] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, status: { $nin: ['draft', 'void', 'cancelled'] }, invoiceDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, status: { $nin: ['draft', 'void', 'cancelled'] }, invoiceDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: { $ne: 'cancelled' }, date: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: { $ne: 'cancelled' }, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'received', paymentDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'received', paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: 'paid', date: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { deletedAt: null, status: 'paid', date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, status: { $in: ['processed', 'completed'] }, requestDate: { $gte: startOfMonth, $lt: tomorrow } } },
            { $group: { _id: null, total: { $sum: '$netRefundAmount' } } },
        ]),
        CustomerReturn.aggregate([
            { $match: { deletedAt: null, status: { $in: ['processed', 'completed'] }, requestDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$netRefundAmount' } } },
        ]),
    ]);

    const grossRevenueThisMonth = currentMonthInvoices[0]?.total || 0;
    const grossRevenueLastMonth = lastMonthInvoices[0]?.total || 0;
    const returnsThisMonthAmt = currentMonthReturns[0]?.total || 0;
    const returnsLastMonthAmt = lastMonthReturns[0]?.total || 0;

    const revenueThisMonth = grossRevenueThisMonth - returnsThisMonthAmt;
    const revenueLastMonth = grossRevenueLastMonth - returnsLastMonthAmt;
    const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
        : 0;

    const billsThisMonth = currentMonthBills[0]?.total || 0;
    const billsLastMonth = lastMonthBills[0]?.total || 0;
    const generalExpensesThisMonth = currentMonthExpenses[0]?.total || 0;
    const generalExpensesLastMonth = lastMonthExpenses[0]?.total || 0;

    const expensesThisMonth = billsThisMonth + generalExpensesThisMonth;
    const expensesLastMonth = billsLastMonth + generalExpensesLastMonth;

    const gpThisMonth = revenueThisMonth - expensesThisMonth;
    const gpLastMonth = revenueLastMonth - expensesLastMonth;
    const gpGrowth = gpLastMonth !== 0
        ? ((gpThisMonth - gpLastMonth) / Math.abs(gpLastMonth) * 100).toFixed(1)
        : 0;

    const collectedThisMonth = currentMonthIn[0]?.total || 0;
    const collectedLastMonth = lastMonthIn[0]?.total || 0;

    const paymentsPaidThisMonth = currentMonthOut[0]?.total || 0;
    const paymentsPaidLastMonth = lastMonthOut[0]?.total || 0;
    const generalExpensesPaidThisMonth = currentMonthExpensesPaid[0]?.total || 0;
    const generalExpensesPaidLastMonth = lastMonthExpensesPaid[0]?.total || 0;

    const paidThisMonth = paymentsPaidThisMonth + generalExpensesPaidThisMonth;
    const paidLastMonth = paymentsPaidLastMonth + generalExpensesPaidLastMonth;

    const cashFlowThisMonth = collectedThisMonth - paidThisMonth;
    const cashFlowLastMonth = collectedLastMonth - paidLastMonth;
    const cashFlowGrowth = cashFlowLastMonth !== 0
        ? ((cashFlowThisMonth - cashFlowLastMonth) / Math.abs(cashFlowLastMonth) * 100).toFixed(1)
        : 0;

    // Orders metrics
    const [todaysOrders, monthOrders, pendingApproval, pendingDispatch] = await Promise.all([
        SalesOrder.countDocuments({ deletedAt: null, orderDate: { $gte: today, $lt: tomorrow } }),
        SalesOrder.countDocuments({ deletedAt: null, orderDate: { $gte: startOfMonth } }),
        SalesOrder.countDocuments({ deletedAt: null, status: 'draft' }),
        SalesOrder.countDocuments({ deletedAt: null, status: 'approved' }),
    ]);

    // Outstanding receivables (unpaid + overdue)
    const [arTotal, overdueAr] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
            { $group: { _id: null, total: { $sum: '$balanceDue' } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: 'overdue' } },
            { $group: { _id: null, total: { $sum: '$balanceDue' }, count: { $sum: 1 } } },
        ]),
    ]);

    // Outstanding payables
    const apTotal = await Bill.aggregate([
        { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$balanceDue' } } },
    ]);

    // Stock alerts
    const lowStockProducts = await StockItem.aggregate([
        {
            $group: {
                _id: '$productId',
                totalAvailable: { $sum: { $subtract: ['$quantities.onHand', '$quantities.reserved'] } },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        {
            $match: {
                'product.deletedAt': null,
                'product.canBeSold': true,
                $expr: { $lte: ['$totalAvailable', '$product.stockLevels.reorderLevel'] },
            },
        },
        {
            $project: {
                productId: '$_id', productCode: '$product.productCode',
                productName: '$product.name', available: '$totalAvailable',
                reorderLevel: '$product.stockLevels.reorderLevel',
            },
        },
        { $limit: 10 },
    ]);

    // Production status
    const [activeProduction, productionThisMonth] = await Promise.all([
        ProductionOrder.countDocuments({ deletedAt: null, status: 'in_progress' }),
        ProductionOrder.countDocuments({
            deletedAt: null,
            status: { $in: ['completed', 'partially_completed'] },
            actualEndDate: { $gte: startOfMonth },
        }),
    ]);

    // Returns this month
    const returnsThisMonth = await CustomerReturn.countDocuments({
        deletedAt: null,
        requestDate: { $gte: startOfMonth },
    });

    // Customer stats
    const [totalCustomers, newCustomersThisMonth, customersOnHold] = await Promise.all([
        Customer.countDocuments({ deletedAt: null, status: 'active' }),
        Customer.countDocuments({ deletedAt: null, createdAt: { $gte: startOfMonth } }),
        Customer.countDocuments({ deletedAt: null, 'creditStatus.onCreditHold': true }),
    ]);

    res.json({
        success: true,
        data: {
            revenue: {
                thisMonth: +revenueThisMonth.toFixed(2),
                lastMonth: +revenueLastMonth.toFixed(2),
                growth: +revenueGrowth,
                invoiceCount: currentMonthInvoices[0]?.count || 0,
            },
            grossProfit: {
                thisMonth: +gpThisMonth.toFixed(2),
                growth: +gpGrowth,
            },
            cashFlow: {
                thisMonth: +cashFlowThisMonth.toFixed(2),
                growth: +cashFlowGrowth,
            },
            orders: {
                today: todaysOrders,
                thisMonth: monthOrders,
                pendingApproval,
                pendingDispatch,
            },
            receivables: {
                total: +(arTotal[0]?.total || 0).toFixed(2),
                overdue: +(overdueAr[0]?.total || 0).toFixed(2),
                overdueCount: overdueAr[0]?.count || 0,
            },
            payables: {
                total: +(apTotal[0]?.total || 0).toFixed(2),
            },
            stock: {
                lowStockCount: lowStockProducts.length,
                lowStockItems: lowStockProducts,
            },
            production: {
                active: activeProduction,
                completedThisMonth: productionThisMonth,
            },
            returns: {
                thisMonth: returnsThisMonth,
            },
            customers: {
                total: totalCustomers,
                newThisMonth: newCustomersThisMonth,
                onHold: customersOnHold,
            },
        },
    });
});

/**
 * GET /api/dashboard/revenue-chart?period=month|week&months=6
 */
export const getRevenueChart = asyncHandler(async (req, res) => {
    const months = Number(req.query.months) || 6;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const data = await Invoice.aggregate([
        { $match: { deletedAt: null, invoiceDate: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    year: { $year: '$invoiceDate' },
                    month: { $month: '$invoiceDate' },
                },
                revenue: { $sum: '$grandTotal' },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Fill in missing months with 0
    const result = [];
    for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const found = data.find((x) => x._id.year === d.getFullYear() && x._id.month === d.getMonth() + 1);
        result.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            monthLabel: d.toLocaleDateString('en-LK', { month: 'short', year: '2-digit' }),
            revenue: found ? +found.revenue.toFixed(2) : 0,
            invoiceCount: found?.count || 0,
        });
    }

    res.json({ success: true, data: result });
});

/**
 * GET /api/dashboard/top-products?limit=10&period=month
 */
export const getTopProducts = asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const period = req.query.period || 'month';

    const now = new Date();
    let startDate;
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: startDate },
                status: { $nin: ['draft', 'cancelled'] },
            },
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                productName: { $first: '$items.productName' },
                productCode: { $first: '$items.productCode' },
                quantitySold: { $sum: '$items.orderedQuantity' },
                revenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } },
                orderCount: { $sum: 1 },
            },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
    ]);

    res.json({ success: true, data });
});

/**
 * GET /api/dashboard/top-customers?limit=10&period=month
 */
export const getTopCustomers = asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const period = req.query.period || 'month';

    const now = new Date();
    let startDate;
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = await Invoice.aggregate([
        { $match: { deletedAt: null, invoiceDate: { $gte: startDate } } },
        {
            $group: {
                _id: '$customerId',
                customerName: { $first: '$customerSnapshot.name' },
                customerCode: { $first: '$customerSnapshot.code' },
                totalInvoiced: { $sum: '$grandTotal' },
                totalPaid: { $sum: '$amountPaid' },
                invoiceCount: { $sum: 1 },
            },
        },
        { $sort: { totalInvoiced: -1 } },
        { $limit: limit },
    ]);

    res.json({ success: true, data });
});