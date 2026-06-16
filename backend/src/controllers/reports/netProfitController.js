import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Invoice from '../../models/Invoice.js';
import Bill from '../../models/Bill.js';
import Expense from '../../models/Expense.js';
import Product from '../../models/Product.js';

/**
 * GET /api/reports/financial/net-profit-analysis
 * Calculates Revenue, Cost (COGS), Expenses, and Net Profit for a period
 * Supports optional productId filtering and grouping by month/year
 */
export const getNetProfitAnalysis = asyncHandler(async (req, res) => {
    const { startDate, endDate, productId, groupBy } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // default Jan 1st
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const matchStage = {
        deletedAt: null,
        invoiceDate: { $gte: start, $lte: end }
    };

    let filterProductId = null;
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        filterProductId = new mongoose.Types.ObjectId(productId);
    }

    // 1. Calculate Revenue and COGS from Invoice Line Items
    const pipeline = [
        { $match: matchStage },
        { $unwind: '$items' }
    ];

    if (filterProductId) {
        pipeline.push({ $match: { 'items.productId': filterProductId } });
    }

    // Lookup products to get purchasePrice for COGS
    pipeline.push(
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } }
    );

    // Grouping identifier
    let groupById = null;
    if (groupBy === 'day') {
        groupById = {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
            day: { $dayOfMonth: '$invoiceDate' }
        };
    } else if (groupBy === 'month') {
        groupById = {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' }
        };
    } else if (groupBy === 'year') {
        groupById = {
            year: { $year: '$invoiceDate' }
        };
    }

    pipeline.push({
        $group: {
            _id: groupById,
            revenue: { $sum: '$items.lineTotal' },
            cogs: {
                $sum: {
                    $multiply: [
                        '$items.quantity',
                        { $ifNull: ['$productInfo.purchasePrice', 0] }
                    ]
                }
            }
        }
    });

    const salesStats = await Invoice.aggregate(pipeline);

    // 2. Fetch general expenses if no product filter is applied (or set to 0 if product filtered)
    let generalExpensesTotal = 0;
    let billsTotal = 0;
    const expensesGrouped = [];

    if (!filterProductId) {
        // Query Expenses
        const expenseMatch = {
            deletedAt: null,
            status: { $ne: 'cancelled' },
            date: { $gte: start, $lte: end }
        };
        const expenseAgg = await Expense.aggregate([
            { $match: expenseMatch },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        generalExpensesTotal = expenseAgg[0]?.total || 0;

        // Query Bills
        const billMatch = {
            deletedAt: null,
            billDate: { $gte: start, $lte: end }
        };
        const billAgg = await Bill.aggregate([
            { $match: billMatch },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } }
        ]);
        billsTotal = billAgg[0]?.total || 0;
    }

    const totalExpenses = generalExpensesTotal + billsTotal;

    // Process aggregated results
    let summary = {
        revenue: 0,
        cogs: 0,
        expenses: totalExpenses,
        netProfit: 0
    };

    const breakdown = salesStats.map(item => {
        const rev = item.revenue || 0;
        const cogs = item.cogs || 0;
        
        // Distribute expenses if grouped by month
        let itemExpenses = 0;
        if (groupBy === 'month' && !filterProductId) {
            // Allocate expenses proportionally or just pull actual expenses for that month
            // For simplicity, we can return expenses total at top level, or calculate actual expense in that month:
            itemExpenses = 0; // calculated separately or mapped
        }

        summary.revenue += rev;
        summary.cogs += cogs;

        const netProfit = rev - cogs - itemExpenses;

        let label = 'Total';
        if (groupBy === 'day' && item._id) {
            label = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
        } else if (groupBy === 'month' && item._id) {
            label = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        } else if (groupBy === 'year' && item._id) {
            label = `${item._id.year}`;
        }

        return {
            label,
            revenue: +rev.toFixed(2),
            cost: +cogs.toFixed(2),
            netProfit: +netProfit.toFixed(2)
        };
    });

    summary.netProfit = summary.revenue - summary.cogs - summary.expenses;

    // Standardize numbers
    summary.revenue = +summary.revenue.toFixed(2);
    summary.cogs = +summary.cogs.toFixed(2);
    summary.expenses = +summary.expenses.toFixed(2);
    summary.netProfit = +summary.netProfit.toFixed(2);

    res.json({
        success: true,
        data: {
            period: { start, end },
            summary,
            breakdown: breakdown.sort((a, b) => a.label.localeCompare(b.label))
        }
    });
});
