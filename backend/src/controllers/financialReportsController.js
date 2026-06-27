import asyncHandler from 'express-async-handler';
import Invoice from '../models/Invoice.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import CustomerReturn from '../models/CustomerReturn.js';

export const getProfitAndLoss = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && startDate !== 'undefined') dateFilter.$gte = new Date(startDate);
    if (endDate && endDate !== 'undefined') dateFilter.$lte = new Date(endDate);

    const invoiceFilter = { status: { $nin: ['draft', 'void', 'cancelled'] }, deletedAt: null };
    if (Object.keys(dateFilter).length > 0) {
        invoiceFilter.invoiceDate = { ...dateFilter };
    }

    const invoices = await Invoice.find(invoiceFilter).populate('items.productId');

    const returnFilter = { status: { $in: ['processed', 'completed'] }, deletedAt: null };
    if (Object.keys(dateFilter).length > 0) {
        returnFilter.requestDate = { ...dateFilter };
    }
    const customerReturns = await CustomerReturn.find(returnFilter);
    let totalReturns = 0;
    customerReturns.forEach(ret => {
        totalReturns += ret.netRefundAmount || 0;
    });

    let grossSales = 0;
    let totalDiscounts = 0;
    let cogs = 0;

    invoices.forEach(inv => {
        const disc = inv.totalDiscount || 0;
        const sub = inv.subtotal || 0;
        grossSales += sub;
        totalDiscounts += disc;
        
        inv.items.forEach(item => {
            const purchasePrice = item.productId?.purchasePrice || 0;
            cogs += (item.quantity * purchasePrice);
        });
    });

    const totalRevenue = grossSales - totalDiscounts - totalReturns;

    const expenseFilter = { status: { $ne: 'cancelled' }, deletedAt: null };
    if (Object.keys(dateFilter).length > 0) {
        expenseFilter.date = { ...dateFilter };
    }

    const expensesAgg = await Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
    ]);
    
    let totalExpenses = 0;
    const expenseBreakdown = expensesAgg.map(e => {
        totalExpenses += e.total;
        return { _id: e._id || 'Uncategorized', amount: +e.total.toFixed(2) };
    });

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    const finalGrossSales = Number(grossSales) || 0;
    const finalTotalDiscounts = Number(totalDiscounts) || 0;
    const finalTotalReturns = Number(totalReturns) || 0;
    const finalTotalRevenue = Number(totalRevenue) || 0;
    const finalCogs = Number(cogs) || 0;
    const finalGrossProfit = Number(grossProfit) || 0;
    const finalTotalExpenses = Number(totalExpenses) || 0;
    const finalNetProfit = Number(netProfit) || 0;

    res.json({
        success: true,
        data: {
            revenue: {
                grossSales: +finalGrossSales.toFixed(2),
                totalDiscounts: +finalTotalDiscounts.toFixed(2),
                totalReturns: +finalTotalReturns.toFixed(2),
                totalRevenue: +finalTotalRevenue.toFixed(2),
            },
            cogs: {
                productCosts: +finalCogs.toFixed(2),
                totalCogs: +finalCogs.toFixed(2),
            },
            expenses: {
                breakdown: expenseBreakdown,
                totalExpenses: +finalTotalExpenses.toFixed(2),
            },
            grossProfit: +finalGrossProfit.toFixed(2),
            netProfit: +finalNetProfit.toFixed(2),
        }
    });
});
