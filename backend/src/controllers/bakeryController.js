import asyncHandler from 'express-async-handler';
import BakeryProduct from '../models/BakeryProduct.js';
import BakeryShop from '../models/BakeryShop.js';
import BakeryBillingStructure from '../models/BakeryBillingStructure.js';
import BakeryInvoice from '../models/BakeryInvoice.js';

// Helper: Generate Invoice Number (e.g. DBH-20260708-001)
const generateInvoiceNumber = async (date) => {
    const invoiceDate = date ? new Date(date) : new Date();
    const yyyy = invoiceDate.getFullYear();
    const mm = String(invoiceDate.getMonth() + 1).padStart(2, '0');
    const dd = String(invoiceDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const startOfDay = new Date(invoiceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(invoiceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await BakeryInvoice.countDocuments({
        date: { $gte: startOfDay, $lte: endOfDay }
    });
    const serial = String(count + 1).padStart(3, '0');
    return `DBH-${dateStr}-${serial}`;
};

// Helper: Auto-save new products
const autoSaveProducts = async (items, userId) => {
    for (const item of items) {
        if (!item.productName) continue;
        const normalizedName = item.productName.trim();
        const exists = await BakeryProduct.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
        });
        if (!exists) {
            await BakeryProduct.create({
                name: normalizedName,
                createdBy: userId
            });
        }
    }
};

// Helper: Get or Create Shop, and Update Balance
const handleShopBalanceOnCreate = async (shopName, shopPhone, newBalance, oldBalance, userId) => {
    const normalizedShop = shopName.trim();
    let shop = await BakeryShop.findOne({
        name: { $regex: new RegExp(`^${normalizedShop}$`, 'i') }
    });

    const balanceChange = newBalance - oldBalance;

    if (!shop) {
        shop = await BakeryShop.create({
            name: normalizedShop,
            phone: shopPhone ? shopPhone.trim() : '',
            balance: newBalance,
            createdBy: userId
        });
    } else {
        if (shopPhone) {
            shop.phone = shopPhone.trim();
        }
        shop.balance += balanceChange;
        await shop.save();
    }
    return shop;
};

// ── Products ──────────────────────────────────────────────────────────
export const getProducts = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const filter = {};
    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }
    const products = await BakeryProduct.find(filter).sort({ name: 1 });
    res.json({ success: true, count: products.length, data: products });
});

export const createProduct = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Product name is required');
    }
    
    const normalizedName = name.trim();
    const exists = await BakeryProduct.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });
    if (exists) {
        res.status(400);
        throw new Error('Product already exists');
    }

    const product = await BakeryProduct.create({
        name: normalizedName,
        createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await BakeryProduct.findById(req.params.id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    await product.deleteOne();
    res.json({ success: true, message: 'Product removed' });
});

// ── Shops ─────────────────────────────────────────────────────────────
export const getShops = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const filter = {};
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }
    const shops = await BakeryShop.find(filter).sort({ name: 1 });
    res.json({ success: true, count: shops.length, data: shops });
});

export const createShop = asyncHandler(async (req, res) => {
    const { name, phone, balance } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Shop name is required');
    }

    const normalizedName = name.trim();
    let shop = await BakeryShop.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });

    if (shop) {
        shop.phone = phone ? phone.trim() : shop.phone;
        if (balance !== undefined) shop.balance = Number(balance);
        await shop.save();
    } else {
        shop = await BakeryShop.create({
            name: normalizedName,
            phone: phone ? phone.trim() : '',
            balance: balance !== undefined ? Number(balance) : 0,
            createdBy: req.user._id
        });
    }

    res.json({ success: true, data: shop });
});

export const suggestShops = asyncHandler(async (req, res) => {
    const { search } = req.query;
    if (!search) {
        return res.json({ success: true, data: [] });
    }
    const shops = await BakeryShop.find({
        $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ]
    }).limit(10);
    res.json({ success: true, data: shops });
});

// ── Billing Structures ───────────────────────────────────────────────
export const getStructures = asyncHandler(async (req, res) => {
    const structures = await BakeryBillingStructure.find({}).sort({ name: 1 });
    res.json({ success: true, count: structures.length, data: structures });
});

export const getStructureById = asyncHandler(async (req, res) => {
    const structure = await BakeryBillingStructure.findById(req.params.id);
    if (!structure) {
        res.status(404);
        throw new Error('Billing structure not found');
    }
    res.json({ success: true, data: structure });
});

export const createStructure = asyncHandler(async (req, res) => {
    const { name, prices } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Structure name is required');
    }

    const normalizedName = name.trim();
    const exists = await BakeryBillingStructure.findOne({
        name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
    });
    if (exists) {
        res.status(400);
        throw new Error('Structure already exists');
    }

    // Auto-save new products defined in the structure
    if (prices && prices.length > 0) {
        await autoSaveProducts(prices, req.user._id);
    }

    const structure = await BakeryBillingStructure.create({
        name: normalizedName,
        prices: prices || [],
        createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: structure });
});

export const updateStructure = asyncHandler(async (req, res) => {
    const { name, prices } = req.body;
    const structure = await BakeryBillingStructure.findById(req.params.id);
    if (!structure) {
        res.status(404);
        throw new Error('Structure not found');
    }

    if (name) {
        const normalizedName = name.trim();
        const exists = await BakeryBillingStructure.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') },
            _id: { $ne: structure._id }
        });
        if (exists) {
            res.status(400);
            throw new Error('Structure with this name already exists');
        }
        structure.name = normalizedName;
    }

    if (prices) {
        await autoSaveProducts(prices, req.user._id);
        structure.prices = prices;
    }

    await structure.save();
    res.json({ success: true, data: structure });
});

export const deleteStructure = asyncHandler(async (req, res) => {
    const structure = await BakeryBillingStructure.findById(req.params.id);
    if (!structure) {
        res.status(404);
        throw new Error('Structure not found');
    }
    await structure.deleteOne();
    res.json({ success: true, message: 'Structure deleted successfully' });
});

// ── Invoices ──────────────────────────────────────────────────────────
export const getInvoices = asyncHandler(async (req, res) => {
    const { startDate, endDate, shopName, page = 1, limit = 15 } = req.query;
    const filter = {};

    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    if (shopName) {
        filter.shopName = { $regex: shopName, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const count = await BakeryInvoice.countDocuments(filter);
    const invoices = await BakeryInvoice.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    // Aggregate summary of matching invoices for dashboard indicators
    const allMatching = await BakeryInvoice.find(filter);
    let totalDelivered = 0;
    let totalReturns = 0;
    let totalReceived = 0;
    let totalOutstanding = 0;

    allMatching.forEach(inv => {
        totalDelivered += (inv.deliveredTotal || 0);
        totalReturns += (inv.returnsTotal || 0);
        totalReceived += (inv.amountReceived || 0);
    });

    // Outstanding of the selected invoices (calculated as final balance sheet sum)
    totalOutstanding = totalDelivered - totalReturns - totalReceived;

    res.json({
        success: true,
        count,
        totalPages: Math.ceil(count / Number(limit)),
        currentPage: Number(page),
        summary: {
            totalDelivered,
            totalReturns,
            totalReceived,
            totalOutstanding
        },
        data: invoices
    });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await BakeryInvoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }
    res.json({ success: true, data: invoice });
});

export const createInvoice = asyncHandler(async (req, res) => {
    const {
        shopName,
        shopPhone,
        date,
        structureId,
        structureName,
        items,
        oldBalance,
        amountReceived,
        specialNote
    } = req.body;

    if (!shopName) {
        res.status(400);
        throw new Error('Shop name is required');
    }
    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('Invoice must contain at least one item');
    }

    // Auto-save any new products in items
    await autoSaveProducts(items, req.user._id);

    // Calculate totals for items
    let deliveredTotal = 0;
    let returnsTotal = 0;

    const processedItems = items.map(item => {
        const price = Number(item.price || 0);
        const morningQty = Number(item.morningQty || 0);
        const afternoonQty = Number(item.afternoonQty || 0);
        const returnQty = Number(item.returnQty || 0);

        const subtotal = (morningQty + afternoonQty) * price;
        const returnTotal = returnQty * price;

        deliveredTotal += subtotal;
        returnsTotal += returnTotal;

        return {
            productName: item.productName.trim(),
            price,
            morningQty,
            afternoonQty,
            returnQty,
            subtotal,
            returnTotal
        };
    });

    const oBalance = Number(oldBalance || 0);
    const amtReceived = Number(amountReceived || 0);
    const grandTotal = oBalance + deliveredTotal - returnsTotal;
    const newBalance = grandTotal - amtReceived;

    const invoiceNumber = await generateInvoiceNumber(date);

    const invoice = await BakeryInvoice.create({
        invoiceNumber,
        shopName: shopName.trim(),
        shopPhone: shopPhone || '',
        date: date ? new Date(date) : new Date(),
        structureId: structureId || null,
        structureName: structureName || '',
        items: processedItems,
        oldBalance: oBalance,
        deliveredTotal,
        returnsTotal,
        grandTotal,
        amountReceived: amtReceived,
        newBalance,
        specialNote: specialNote || '',
        createdBy: req.user._id
    });

    // Update shop balance
    await handleShopBalanceOnCreate(shopName, shopPhone, newBalance, oBalance, req.user._id);

    res.status(201).json({ success: true, data: invoice });
});

export const updateInvoice = asyncHandler(async (req, res) => {
    const {
        shopName,
        shopPhone,
        date,
        structureId,
        structureName,
        items,
        oldBalance,
        amountReceived,
        specialNote
    } = req.body;

    const invoice = await BakeryInvoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    const previousNewBalance = invoice.newBalance;

    // Auto-save products if items list is provided
    if (items) {
        await autoSaveProducts(items, req.user._id);
    }

    // Calculate updated totals
    let deliveredTotal = invoice.deliveredTotal;
    let returnsTotal = invoice.returnsTotal;
    let processedItems = invoice.items;

    if (items) {
        deliveredTotal = 0;
        returnsTotal = 0;
        processedItems = items.map(item => {
            const price = Number(item.price || 0);
            const morningQty = Number(item.morningQty || 0);
            const afternoonQty = Number(item.afternoonQty || 0);
            const returnQty = Number(item.returnQty || 0);

            const subtotal = (morningQty + afternoonQty) * price;
            const returnTotal = returnQty * price;

            deliveredTotal += subtotal;
            returnsTotal += returnTotal;

            return {
                productName: item.productName.trim(),
                price,
                morningQty,
                afternoonQty,
                returnQty,
                subtotal,
                returnTotal
            };
        });
    }

    const oBalance = oldBalance !== undefined ? Number(oldBalance) : invoice.oldBalance;
    const amtReceived = amountReceived !== undefined ? Number(amountReceived) : invoice.amountReceived;
    const grandTotal = oBalance + deliveredTotal - returnsTotal;
    const newBalance = grandTotal - amtReceived;

    invoice.shopName = shopName ? shopName.trim() : invoice.shopName;
    invoice.shopPhone = shopPhone !== undefined ? shopPhone : invoice.shopPhone;
    invoice.date = date ? new Date(date) : invoice.date;
    invoice.structureId = structureId !== undefined ? structureId : invoice.structureId;
    invoice.structureName = structureName !== undefined ? structureName : invoice.structureName;
    invoice.items = processedItems;
    invoice.oldBalance = oBalance;
    invoice.deliveredTotal = deliveredTotal;
    invoice.returnsTotal = returnsTotal;
    invoice.grandTotal = grandTotal;
    invoice.amountReceived = amtReceived;
    invoice.newBalance = newBalance;
    invoice.specialNote = specialNote !== undefined ? specialNote : invoice.specialNote;

    await invoice.save();

    // Update shop balance with difference: shop.balance += (invoice.newBalance - previousNewBalance)
    const normalizedShop = invoice.shopName.trim();
    let shop = await BakeryShop.findOne({
        name: { $regex: new RegExp(`^${normalizedShop}$`, 'i') }
    });

    if (shop) {
        if (shopPhone) shop.phone = shopPhone.trim();
        shop.balance += (newBalance - previousNewBalance);
        await shop.save();
    }

    res.json({ success: true, data: invoice });
});

export const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await BakeryInvoice.findById(req.params.id);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    // Revert shop balance: shop.balance -= (newBalance - oldBalance)
    const normalizedShop = invoice.shopName.trim();
    const shop = await BakeryShop.findOne({
        name: { $regex: new RegExp(`^${normalizedShop}$`, 'i') }
    });

    if (shop) {
        shop.balance -= (invoice.newBalance - invoice.oldBalance);
        await shop.save();
    }

    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted successfully' });
});

export const getBakeryDashboard = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // 1. Counts
    const shopCount = await BakeryShop.countDocuments();
    const productCount = await BakeryProduct.countDocuments();

    // 2. Outstanding Balance
    const shops = await BakeryShop.find();
    const totalOutstanding = shops.reduce((sum, s) => sum + (s.balance || 0), 0);

    // 3. Determine Date Range for Filtered Metrics
    let start, end;
    if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
    } else {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // 4. Invoices query inside date range
    const invoices = await BakeryInvoice.find({
        date: { $gte: start, $lte: end }
    });

    let rangeDeliveries = 0;
    let rangeReturns = 0;
    let rangeReceived = 0;

    invoices.forEach(inv => {
        rangeDeliveries += (inv.deliveredTotal || 0);
        rangeReturns += (inv.returnsTotal || 0);
        rangeReceived += (inv.amountReceived || 0);
    });

    const rangeSales = rangeDeliveries - rangeReturns;

    // 5. Today's Invoices query
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const todayInvoices = await BakeryInvoice.find({
        date: { $gte: startOfToday, $lte: endOfToday }
    });

    let todaySales = 0;
    todayInvoices.forEach(inv => {
        todaySales += ((inv.deliveredTotal || 0) - (inv.returnsTotal || 0));
    });

    // 6. Recent Invoices (matching range)
    const recentInvoices = await BakeryInvoice.find({
        date: { $gte: start, $lte: end }
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(10);

    // 7. Top Shops (Inside range)
    const topShopsAggregation = await BakeryInvoice.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: "$shopName",
                totalSales: { $sum: { $subtract: ["$deliveredTotal", "$returnsTotal"] } },
                totalReceived: { $sum: "$amountReceived" }
            }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 5 }
    ]);

    const topShops = topShopsAggregation.map(item => ({
        shopName: item._id,
        totalSales: item.totalSales,
        totalReceived: item.totalReceived
    }));

    // 8. Trend Chart (Daily if <= 31 days, otherwise Monthly)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const trendData = [];
    if (diffDays <= 31) {
        let current = new Date(start);
        while (current <= end) {
            const dayStart = new Date(current);
            dayStart.setHours(0,0,0,0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23,59,59,999);

            const dayInvoices = await BakeryInvoice.find({
                date: { $gte: dayStart, $lte: dayEnd }
            });

            let del = 0;
            let ret = 0;
            dayInvoices.forEach(inv => {
                del += (inv.deliveredTotal || 0);
                ret += (inv.returnsTotal || 0);
            });

            const dayLabel = current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            trendData.push({
                monthLabel: dayLabel,
                sales: del - ret,
                deliveries: del,
                returns: ret
            });

            current.setDate(current.getDate() + 1);
        }
    } else {
        let current = new Date(start);
        while (current <= end) {
            const mStart = new Date(current.getFullYear(), current.getMonth(), 1);
            const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

            const monthInvoices = await BakeryInvoice.find({
                date: { $gte: mStart, $lte: mEnd }
            });

            let del = 0;
            let ret = 0;
            monthInvoices.forEach(inv => {
                del += (inv.deliveredTotal || 0);
                ret += (inv.returnsTotal || 0);
            });

            const monthLabel = current.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            trendData.push({
                monthLabel,
                sales: del - ret,
                deliveries: del,
                returns: ret
            });

            current.setMonth(current.getMonth() + 1);
            current.setDate(1);
        }
    }

    res.json({
        success: true,
        data: {
            kpis: {
                monthlySales: rangeSales,
                monthlyReceived: rangeReceived,
                totalOutstanding,
                todaySales,
                shopCount,
                productCount
            },
            recentInvoices,
            topShops,
            trendData
        }
    });
});
