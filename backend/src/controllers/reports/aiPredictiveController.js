import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import SalesOrder from '../../models/SalesOrder.js';
import Expense from '../../models/Expense.js';
import Payroll from '../../models/Payroll.js';
import Installment from '../../models/Installment.js';
import BankAccount from '../../models/BankAccount.js';
import StockItem from '../../models/StockItem.js';

/**
 * GET /api/reports/predictive/analytics
 */
export const getPredictiveAnalytics = asyncHandler(async (req, res) => {
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    // 1. Fetch all active products
    const products = await Product.find({ canBeSold: true }).lean();
    
    // 2. Fetch stock levels aggregated by product
    const stockAgg = await StockItem.aggregate([
        {
            $group: {
                _id: '$productId',
                totalOnHand: { $sum: '$quantities.onHand' },
                totalReserved: { $sum: '$quantities.reserved' }
            }
        }
    ]);
    const stockMap = new Map(stockAgg.map(s => [s._id.toString(), s]));

    // 3. Aggregate historical sales (last 90 days) grouped by product and day
    const salesAgg = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: ninetyDaysAgo },
                status: { $nin: ['draft', 'cancelled'] }
            }
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: {
                    productId: '$items.productId',
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } }
                },
                qtySold: { $sum: '$items.orderedQuantity' },
                revenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } }
            }
        }
    ]);

    // Group sales data by product ID for model fitting
    const salesByProduct = {};
    salesAgg.forEach(s => {
        const prodId = s._id.productId.toString();
        if (!salesByProduct[prodId]) {
            salesByProduct[prodId] = [];
        }
        salesByProduct[prodId].push({
            date: s._id.date,
            qty: s.qtySold,
            revenue: s.revenue
        });
    });

    // 4. Financial overview (Revenue last 30d, Expenses last 30d, Bank Balance)
    const [monthlySalesAgg, monthlyExpensesAgg, monthlyPayrollAgg, bankAccounts] = await Promise.all([
        SalesOrder.aggregate([
            {
                $match: {
                    deletedAt: null,
                    orderDate: { $gte: thirtyDaysAgo },
                    status: { $nin: ['draft', 'cancelled'] }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$grandTotal' }
                }
            }
        ]),
        Expense.aggregate([
            {
                $match: {
                    deletedAt: null,
                    date: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]),
        Payroll.aggregate([
            {
                $match: {
                    deletedAt: null,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    netPay: { $sum: '$totalNetPayable' }
                }
            }
        ]),
        BankAccount.find({}).lean()
    ]);

    // Financial trends (60-30 days ago vs 30 days ago to today)
    const [salesPrevAgg, expensesPrevAgg] = await Promise.all([
        SalesOrder.aggregate([
            {
                $match: {
                    deletedAt: null,
                    orderDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
                    status: { $nin: ['draft', 'cancelled'] }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$grandTotal' }
                }
            }
        ]),
        Expense.aggregate([
            {
                $match: {
                    deletedAt: null,
                    date: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ])
    ]);

    // Installments status
    const installments = await Installment.find({ status: 'active' }).lean();

    const revenueM3 = monthlySalesAgg[0]?.revenue || 0;
    const revenueM2 = salesPrevAgg[0]?.revenue || 0;
    const expensesM3 = (monthlyExpensesAgg[0]?.total || 0) + (monthlyPayrollAgg[0]?.netPay || 0);
    const expensesM2 = expensesPrevAgg[0]?.total || 0;

    const totalCash = bankAccounts.reduce((acc, b) => acc + (b.currentBalance || 0), 0);

    // 5. Calculate Product-Wise Forecasts & Predictions
    const predictions = [];
    let criticalStockoutsCount = 0;

    products.forEach(p => {
        const prodId = p._id.toString();
        const productSales = salesByProduct[prodId] || [];
        const stockInfo = stockMap.get(prodId) || { totalOnHand: 0, totalReserved: 0 };
        const currentStock = Math.max(0, stockInfo.totalOnHand - stockInfo.totalReserved);

        // Calculate Average Sales Velocity (90 day average)
        const totalSold = productSales.reduce((acc, s) => acc + s.qty, 0);
        const dailyVelocity = +(totalSold / 90).toFixed(4); // Average units sold per day

        // Simple Linear Regression over days (slope computation)
        // Sort sales by date to construct chronological series
        const sortedSales = [...productSales].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let slope = 0;
        if (sortedSales.length >= 2) {
            // Find regression line parameters
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumXX = 0;
            const n = sortedSales.length;

            sortedSales.forEach((s, idx) => {
                const x = idx;
                const y = s.qty;
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumXX += x * x;
            });

            const denominator = (n * sumXX - sumX * sumX);
            if (denominator !== 0) {
                slope = (n * sumXY - sumX * sumY) / denominator;
            }
        }

        // Forecast next 30 days demand
        // Combined forecast: Base daily velocity projection + trend weight (max of 0)
        const forecasted30dDemand = Math.max(0, Math.round(dailyVelocity * 30 + slope * 15));
        const forecasted60dDemand = Math.max(0, Math.round(dailyVelocity * 60 + slope * 30));
        const forecasted90dDemand = Math.max(0, Math.round(dailyVelocity * 90 + slope * 45));

        // Days until stockout
        let daysUntilStockout = null;
        if (dailyVelocity > 0) {
            daysUntilStockout = Math.round(currentStock / dailyVelocity);
            if (daysUntilStockout <= 14) {
                criticalStockoutsCount++;
            }
        } else if (currentStock === 0) {
            daysUntilStockout = 0;
            criticalStockoutsCount++;
        }

        // Recommended Reorder level
        const leadTimeDays = 7; // default supplier lead time
        const safetyBufferDays = 7; // safety buffer
        const safetyStock = Math.ceil(dailyVelocity * safetyBufferDays);
        const reorderLevel = Math.ceil(dailyVelocity * (leadTimeDays + safetyBufferDays)) || 5; // default fallback

        // Recommended reorder quantity: enough for 30 days sales
        const recommendedReorderQty = Math.ceil(dailyVelocity * 30) || 20;

        predictions.push({
            productId: prodId,
            productName: p.name,
            productCode: p.productCode || 'N/A',
            currentStock,
            dailyVelocity,
            trendSlope: slope,
            forecasted30dDemand,
            forecasted60dDemand,
            forecasted90dDemand,
            daysUntilStockout,
            safetyStock,
            reorderLevel,
            recommendedReorderQty,
            reorderAlert: daysUntilStockout !== null && daysUntilStockout <= (leadTimeDays + safetyBufferDays)
        });
    });

    // 6. Generate Business AI Analyst Insights
    const insights = [];
    
    // Default business health score
    let healthScore = 80;

    if (products.length === 0) {
        // Dynamic onboarding insight
        insights.push({
            type: 'info',
            title: 'Welcome to AI Analyst!',
            content: 'Register products and record checkout sales in the POS terminal to begin generating predictive demand forecasts, sales velocity charts, and active inventory alerts.'
        });
    } else {
        // Business Health Score heuristic calculation
        // Penalize health score for:
        // - negative revenue growth
        // - high overhead ratio
        // - active stockouts
        // - unpaid overdue installments
        let healthDeductions = 0;

        // Revenue Insight
        if (revenueM2 > 0) {
            const revGrowth = ((revenueM3 - revenueM2) / revenueM2) * 100;
            if (revGrowth < 0) {
                healthDeductions += Math.min(25, Math.abs(revGrowth) / 2);
                insights.push({
                    type: 'risk',
                    title: 'Revenue Downtrend Detected',
                    content: `Monthly revenues fell by ${Math.abs(revGrowth).toFixed(1)}% compared to the prior period. Consider auditing POS discount margins or starting a loyalty campaign.`
                });
            } else if (revGrowth > 5) {
                insights.push({
                    type: 'opportunity',
                    title: 'Healthy Revenue Growth',
                    content: `Business is showing a solid MoM expansion of +${revGrowth.toFixed(1)}% in sales invoice collections. Keep marketing high-margin products.`
                });
            }
        } else if (revenueM3 > 0) {
            insights.push({
                type: 'opportunity',
                title: 'Sales Launch Initialized',
                content: `POS registers recorded ${new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(revenueM3)} in revenue over the past 30 days. Model tracking is now live.`
            });
        }

        // Expenses Insight
        if (revenueM3 > 0) {
            const expenseRatio = (expensesM3 / revenueM3) * 100;
            if (expenseRatio > 60) {
                healthDeductions += 15;
                insights.push({
                    type: 'risk',
                    title: 'Elevated Operating Expenses',
                    content: `Operating expenses represent ${expenseRatio.toFixed(1)}% of total revenues. Recommend reviewing supplier GRN pricing and staff labor utilization.`
                });
            }
        }

        // Critical Stockout alerts
        if (criticalStockoutsCount > 0) {
            healthDeductions += Math.min(20, criticalStockoutsCount * 3);
            insights.push({
                type: 'warning',
                title: 'High Stockout Risks',
                content: `${criticalStockoutsCount} products are either out of stock or will run out within 14 days. Place purchase orders now to avoid service disruption.`
            });
        }

        // Installment overdue alerts
        let overdueInstallmentsAmount = 0;
        let overdueCount = 0;
        installments.forEach(inst => {
            inst.schedule.forEach(item => {
                if (item.status !== 'paid' && new Date(item.dueDate) < today) {
                    overdueInstallmentsAmount += item.amount - (item.paidAmount || 0);
                    overdueCount++;
                }
            });
        });

        if (overdueCount > 0) {
            healthDeductions += Math.min(15, overdueCount * 2);
            insights.push({
                type: 'risk',
                title: 'Outstanding Installment Delays',
                content: `There are ${overdueCount} installment payments currently overdue, representing ${new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(overdueInstallmentsAmount)} in locked cash. Send ledger reminders.`
            });
        }

        healthScore = Math.max(10, 100 - Math.round(healthDeductions));
    }

    // General Strategic Advice
    if (totalCash > 0 && expensesM3 > 0) {
        const runawayMonths = +(totalCash / expensesM3).toFixed(1);
        if (runawayMonths < 1.5) {
            insights.push({
                type: 'warning',
                title: 'Tight Cash Reserve Runway',
                content: `Current bank balances can sustain business expenses for approximately ${runawayMonths} months. Consider tightening operational credit terms.`
            });
        } else if (runawayMonths >= 3) {
            insights.push({
                type: 'opportunity',
                title: 'Strong Cash Reserves',
                content: `Bank balances hold over ${runawayMonths} months of expense buffer. Safe to allocate surplus funds towards procurement discounts or manufacturing investments.`
            });
        }
    }

    // Fallback info insight if list is thin
    if (insights.length < 2) {
        insights.push({
            type: 'info',
            title: 'System Operational',
            content: 'AI business forecasting algorithms are operating normally. Real-time sales velocities and stock levels are being monitored.'
        });
    }

    // 7. Projected 30d Revenue
    const monthlyGrowth = revenueM2 > 0 ? (revenueM3 - revenueM2) / revenueM2 : 0;
    const projected30dRevenue = Math.max(0, Math.round(revenueM3 * (1 + monthlyGrowth)));

    res.json({
        success: true,
        data: {
            businessHealthScore: healthScore,
            metrics: {
                currentCashBalance: totalCash,
                revenue30d: revenueM3,
                projectedRevenue30d: projected30dRevenue,
                expenses30d: expensesM3,
                criticalStockouts: criticalStockoutsCount
            },
            predictions,
            insights
        }
    });
});
