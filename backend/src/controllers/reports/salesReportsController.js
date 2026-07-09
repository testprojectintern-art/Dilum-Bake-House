import asyncHandler from 'express-async-handler';
import BakeryInvoice from '../../models/BakeryInvoice.js';
import NuwaraEliyaDelivery from '../../models/NuwaraEliyaDelivery.js';
import BakeryShop from '../../models/BakeryShop.js';

/**
 * GET /api/reports/sales/summary?startDate=&endDate=
 */
export const getSalesSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await BakeryInvoice.find({ date: { $gte: start, $lte: end } });
    const nuwaraDeliveries = await NuwaraEliyaDelivery.find({ date: { $gte: start, $lte: end } });

    let rangeDeliveries = 0;
    let rangeReturns = 0;
    let rangeReceived = 0;
    let rangeNetSales = 0;
    let rangeOutstanding = 0;
    let orderCount = invoices.length + nuwaraDeliveries.length;

    invoices.forEach(inv => {
        rangeDeliveries += (inv.deliveredTotal || 0);
        rangeReturns += (inv.returnsTotal || 0);
        rangeReceived += (inv.amountReceived || 0);
        rangeNetSales += ((inv.deliveredTotal || 0) - (inv.returnsTotal || 0));
        rangeOutstanding += (inv.newBalance || 0);
    });

    let nuwaraDeliveriesCost = 0;
    let nuwaraReturnsCost = 0;
    let nuwaraReceivedAmt = 0;
    let nuwaraSales = 0;
    let nuwaraOutstanding = 0;

    nuwaraDeliveries.forEach(del => {
        nuwaraDeliveriesCost += (del.loadCost || 0);
        nuwaraReturnsCost += (del.returnsCost || 0);
        nuwaraReceivedAmt += ((del.bankDeposits || 0) + (del.amountPaid || 0));
        nuwaraSales += ((del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0));
        nuwaraOutstanding += (del.nextOutstanding || 0) + (del.shopsOutstanding || 0);
    });

    const totalSales = rangeNetSales + nuwaraSales;
    const totalCollected = rangeReceived + nuwaraReceivedAmt;
    const totalOutstanding = rangeOutstanding + nuwaraOutstanding;

    const collectionEfficiency = totalSales > 0
        ? +((totalCollected / totalSales) * 100).toFixed(1)
        : 0;

    // Status breakdown (bakery vs nuwara eliya)
    const statusBreakdown = [
        { _id: 'Milk Bar & Hospital', count: invoices.length, value: rangeNetSales },
        { _id: 'Nuwara Eliya Delivery', count: nuwaraDeliveries.length, value: nuwaraSales }
    ];

    res.json({
        success: true,
        data: {
            period: { startDate: start, endDate: end },
            orders: {
                totalOrders: orderCount,
                totalValue: totalSales,
                avgOrderValue: orderCount > 0 ? +(totalSales / orderCount).toFixed(2) : 0
            },
            statusBreakdown,
            invoices: {
                total: +totalSales.toFixed(2),
                paid: +totalCollected.toFixed(2),
                balance: +totalOutstanding.toFixed(2),
                count: orderCount
            },
            payments: {
                collected: +totalCollected.toFixed(2),
                count: orderCount
            },
            collectionEfficiency
        }
    });
});

/**
 * GET /api/reports/sales/by-product?startDate=&endDate=&limit=50
 */
export const getSalesByProduct = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await BakeryInvoice.find({ date: { $gte: start, $lte: end } });
    const nuwaraDeliveries = await NuwaraEliyaDelivery.find({ date: { $gte: start, $lte: end } });

    const productStats = {}; // productName -> { quantitySold, netRevenue, avgPrice, orderCount }

    const getStats = (name) => {
        if (!productStats[name]) {
            productStats[name] = {
                productName: name,
                quantitySold: 0,
                netRevenue: 0,
                orderCount: 0,
                priceSum: 0
            };
        }
        return productStats[name];
    };

    // 1. Normal invoices
    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const stats = getStats(item.productName);
            const sold = (item.morningQty || 0) + (item.afternoonQty || 0) - (item.returnQty || 0);
            stats.quantitySold += sold;
            stats.netRevenue += sold * (item.price || 0);
            stats.priceSum += item.price || 0;
            stats.orderCount += 1;
        });
    });

    // 2. Nuwara Eliya deliveries
    nuwaraDeliveries.forEach(del => {
        const loadedMap = {};
        del.loadedItems.forEach(item => {
            loadedMap[item.productName] = { qty: item.qty || 0, price: item.price || 0 };
        });

        del.returnedItems.forEach(item => {
            if (loadedMap[item.productName]) {
                loadedMap[item.productName].qty -= (item.qty || 0);
            } else {
                loadedMap[item.productName] = { qty: -(item.qty || 0), price: item.price || 0 };
            }
        });

        del.onBoardItems.forEach(item => {
            if (loadedMap[item.productName]) {
                loadedMap[item.productName].qty -= (item.qty || 0);
            } else {
                loadedMap[item.productName] = { qty: -(item.qty || 0), price: item.price || 0 };
            }
        });

        Object.entries(loadedMap).forEach(([name, data]) => {
            const stats = getStats(name);
            stats.quantitySold += data.qty;
            stats.netRevenue += data.qty * data.price;
            stats.priceSum += data.price;
            stats.orderCount += 1;
        });
    });

    const data = Object.values(productStats).map(stats => {
        const avgPrice = stats.orderCount > 0 ? (stats.priceSum / stats.orderCount) : 0;
        return {
            productId: stats.productName, // use name as ID for bakery
            productCode: 'BAKERY',
            productName: stats.productName,
            quantitySold: stats.quantitySold,
            avgPrice: parseFloat(avgPrice.toFixed(2)),
            grossRevenue: parseFloat(stats.netRevenue.toFixed(2)),
            totalDiscount: 0,
            netRevenue: parseFloat(stats.netRevenue.toFixed(2)),
            orderCount: stats.orderCount
        };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue)
    .slice(0, Number(limit));

    res.json({ success: true, data });
});

/**
 * GET /api/reports/sales/by-customer?startDate=&endDate=&limit=50
 */
export const getSalesByCustomer = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await BakeryInvoice.find({ date: { $gte: start, $lte: end } });
    const nuwaraDeliveries = await NuwaraEliyaDelivery.find({ date: { $gte: start, $lte: end } });

    const shopStats = {}; // shopName -> { orderCount, totalOrdered, paid, outstanding }

    const getShop = (name) => {
        if (!shopStats[name]) {
            shopStats[name] = {
                customerName: name,
                orderCount: 0,
                totalOrdered: 0,
                paid: 0,
                outstanding: 0
            };
        }
        return shopStats[name];
    };

    invoices.forEach(inv => {
        const shop = getShop(inv.shopName);
        shop.orderCount += 1;
        shop.totalOrdered += (inv.deliveredTotal || 0) - (inv.returnsTotal || 0);
        shop.paid += (inv.amountReceived || 0);
        shop.outstanding += (inv.newBalance || 0);
    });

    nuwaraDeliveries.forEach(del => {
        const name = `Nuwara Eliya (${del.structureName || 'Route'})`;
        const shop = getShop(name);
        const netSales = (del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0);
        shop.orderCount += 1;
        shop.totalOrdered += netSales;
        shop.paid += (del.bankDeposits || 0) + (del.amountPaid || 0);
        shop.outstanding += (del.nextOutstanding || 0) + (del.shopsOutstanding || 0);
    });

    const enriched = Object.values(shopStats).map(shop => {
        const avgOrderValue = shop.orderCount > 0 ? (shop.totalOrdered / shop.orderCount) : 0;
        return {
            _id: shop.customerName,
            customerCode: 'SHOP',
            customerName: shop.customerName,
            orderCount: shop.orderCount,
            totalOrdered: parseFloat(shop.totalOrdered.toFixed(2)),
            avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
            invoiced: parseFloat(shop.totalOrdered.toFixed(2)),
            paid: parseFloat(shop.paid.toFixed(2)),
            outstanding: parseFloat(shop.outstanding.toFixed(2))
        };
    })
    .sort((a, b) => b.totalOrdered - a.totalOrdered)
    .slice(0, Number(limit));

    res.json({ success: true, data: enriched });
});

/**
 * GET /api/reports/sales/trend?startDate=&endDate=&groupBy=day|week|month
 */
export const getSalesTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const invoices = await BakeryInvoice.find({ date: { $gte: start, $lte: end } });
    const nuwaraDeliveries = await NuwaraEliyaDelivery.find({ date: { $gte: start, $lte: end } });

    const trends = {};

    const getTrendKey = (date) => {
        const d = new Date(date);
        const y = d.getFullYear();
        if (groupBy === 'month') {
            return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (groupBy === 'week') {
            const firstDayOfYear = new Date(y, 0, 1);
            const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
            const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            return `${y}-W${week}`;
        } else {
            return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    };

    const addTrend = (date, value) => {
        const key = getTrendKey(date);
        if (!trends[key]) {
            trends[key] = { label: key, count: 0, total: 0 };
        }
        trends[key].count += 1;
        trends[key].total += value;
    };

    invoices.forEach(inv => {
        const val = (inv.deliveredTotal || 0) - (inv.returnsTotal || 0);
        addTrend(inv.date, val);
    });

    nuwaraDeliveries.forEach(del => {
        const val = (del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0);
        addTrend(del.date, val);
    });

    const result = Object.values(trends).sort((a, b) => a.label.localeCompare(b.label));

    res.json({ success: true, data: result });
});