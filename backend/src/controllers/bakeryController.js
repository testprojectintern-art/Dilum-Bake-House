import asyncHandler from 'express-async-handler';
import BakeryProduct from '../models/BakeryProduct.js';
import BakeryShop from '../models/BakeryShop.js';
import BakeryBillingStructure from '../models/BakeryBillingStructure.js';
import BakeryInvoice from '../models/BakeryInvoice.js';
import NuwaraEliyaDelivery from '../models/NuwaraEliyaDelivery.js';
import BakeryFinanceItem from '../models/BakeryFinanceItem.js';
import BankAccount from '../models/BankAccount.js';
import { sendBakeryInvoiceSms } from '../utils/smsHelper.js';

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
const handleShopBalanceOnCreate = async (shopName, shopPhone, newBalance, oldBalance, userId, contacts) => {
    const normalizedShop = shopName.trim();
    let shop = await BakeryShop.findOne({
        name: { $regex: new RegExp(`^${normalizedShop}$`, 'i') }
    });

    const balanceChange = newBalance - oldBalance;

    if (!shop) {
        shop = await BakeryShop.create({
            name: normalizedShop,
            phone: shopPhone ? shopPhone.trim() : '',
            contacts: contacts || [],
            balance: newBalance,
            createdBy: userId
        });
    } else {
        if (shopPhone) {
            shop.phone = shopPhone.trim();
        }
        if (contacts !== undefined) {
            shop.contacts = contacts;
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
            { phone: { $regex: search, $options: 'i' } },
            { "contacts.name": { $regex: search, $options: 'i' } },
            { "contacts.phone": { $regex: search, $options: 'i' } }
        ];
    }
    const shops = await BakeryShop.find(filter).sort({ name: 1 });
    res.json({ success: true, count: shops.length, data: shops });
});

export const createShop = asyncHandler(async (req, res) => {
    const { name, phone, balance, contacts } = req.body;
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
        if (contacts !== undefined) shop.contacts = contacts;
        await shop.save();
    } else {
        shop = await BakeryShop.create({
            name: normalizedName,
            phone: phone ? phone.trim() : '',
            balance: balance !== undefined ? Number(balance) : 0,
            contacts: contacts || [],
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
            { phone: { $regex: search, $options: 'i' } },
            { "contacts.name": { $regex: search, $options: 'i' } },
            { "contacts.phone": { $regex: search, $options: 'i' } }
        ]
    }).limit(10);
    res.json({ success: true, data: shops });
});

export const deleteShop = asyncHandler(async (req, res) => {
    const shop = await BakeryShop.findById(req.params.id);
    if (!shop) {
        res.status(404);
        throw new Error('Shop not found');
    }
    await shop.deleteOne();
    res.json({ success: true, message: 'Shop deleted successfully' });
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
        specialNote,
        contacts,
        smsRecipients
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
    await handleShopBalanceOnCreate(shopName, shopPhone, newBalance, oBalance, req.user._id, contacts);

    // Trigger SMS sending asynchronously in the background
    if (smsRecipients && smsRecipients.length > 0) {
        sendBakeryInvoiceSms(invoice, smsRecipients).catch(err => {
            console.error('[SMS TRIGGER ERROR] failed:', err);
        });
    }

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
        specialNote,
        contacts,
        smsRecipients
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
        if (contacts !== undefined) shop.contacts = contacts;
        shop.balance += (newBalance - previousNewBalance);
        await shop.save();
    }

    // Trigger SMS sending asynchronously in the background
    if (smsRecipients && smsRecipients.length > 0) {
        sendBakeryInvoiceSms(invoice, smsRecipients).catch(err => {
            console.error('[SMS TRIGGER ERROR] failed:', err);
        });
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
    let totalOutstanding = shops.reduce((sum, s) => sum + (s.balance || 0), 0);

    const latestNuwaraEliya = await NuwaraEliyaDelivery.findOne().sort({ date: -1, createdAt: -1 });
    if (latestNuwaraEliya) {
        totalOutstanding += (latestNuwaraEliya.nextOutstanding || 0) + (latestNuwaraEliya.shopsOutstanding || 0);
    }

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

    const nuwaraEliyaDeliveries = await NuwaraEliyaDelivery.find({
        date: { $gte: start, $lte: end }
    });

    let rangeDeliveries = 0;
    let rangeReturns = 0;
    let rangeReceived = 0;
    let rangeNetSales = 0;

    invoices.forEach(inv => {
        rangeDeliveries += (inv.deliveredTotal || 0);
        rangeReturns += (inv.returnsTotal || 0);
        rangeReceived += (inv.amountReceived || 0);
        rangeNetSales += ((inv.deliveredTotal || 0) - (inv.returnsTotal || 0));
    });

    let nuwaraDeliveries = 0;
    let nuwaraReturns = 0;
    let nuwaraReceived = 0;
    let nuwaraSales = 0;

    nuwaraEliyaDeliveries.forEach(del => {
        nuwaraDeliveries += (del.loadCost || 0);
        nuwaraReturns += (del.returnsCost || 0);
        nuwaraReceived += ((del.bankDeposits || 0) + (del.amountPaid || 0));
        nuwaraSales += ((del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0));
    });

    const totalPeriodSales = rangeNetSales + nuwaraSales;
    const totalPeriodReceived = rangeReceived + nuwaraReceived;

    // 5. Today's Invoices query
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const todayInvoices = await BakeryInvoice.find({
        date: { $gte: startOfToday, $lte: endOfToday }
    });

    const todayNuwaraDeliveries = await NuwaraEliyaDelivery.find({
        date: { $gte: startOfToday, $lte: endOfToday }
    });

    let todaySales = 0;
    todayInvoices.forEach(inv => {
        todaySales += ((inv.deliveredTotal || 0) - (inv.returnsTotal || 0));
    });
    todayNuwaraDeliveries.forEach(del => {
        todaySales += ((del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0));
    });

    // 6. Recent transactions (matching range)
    const recentInvoicesQuery = await BakeryInvoice.find({
        date: { $gte: start, $lte: end }
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(10);

    const recentNuwaraQuery = await NuwaraEliyaDelivery.find({
        date: { $gte: start, $lte: end }
    })
    .sort({ date: -1, createdAt: -1 })
    .limit(10);

    const combinedRecent = [
        ...recentInvoicesQuery.map(inv => ({
            _id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            shopName: inv.shopName,
            date: inv.date,
            grandTotal: inv.grandTotal,
            amountReceived: inv.amountReceived,
            newBalance: inv.newBalance,
            type: 'bakery'
        })),
        ...recentNuwaraQuery.map(del => ({
            _id: del._id,
            invoiceNumber: del.billNumber,
            shopName: `Nuwara Eliya (${del.structureName || 'Route'})`,
            date: del.date,
            grandTotal: (del.loadCost || 0) - (del.returnsCost || 0) - (del.onBoardStockCost || 0),
            amountReceived: (del.bankDeposits || 0) + (del.amountPaid || 0),
            newBalance: (del.nextOutstanding || 0) + (del.shopsOutstanding || 0),
            type: 'nuwara-eliya'
        }))
    ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

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
        }
    ]);

    const topNuwaraAggregation = await NuwaraEliyaDelivery.aggregate([
        {
            $match: {
                date: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: "$structureName",
                totalSales: { $sum: { $subtract: [{ $subtract: ["$loadCost", "$returnsCost"] }, "$onBoardStockCost"] } },
                totalReceived: { $sum: { $add: ["$bankDeposits", "$amountPaid"] } }
            }
        }
    ]);

    const combinedShops = [
        ...topShopsAggregation.map(item => ({
            shopName: item._id,
            totalSales: item.totalSales,
            totalReceived: item.totalReceived
        })),
        ...topNuwaraAggregation.map(item => ({
            shopName: `Nuwara Eliya (${item._id || 'Route'})`,
            totalSales: item.totalSales,
            totalReceived: item.totalReceived
        }))
    ]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

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

            const dayNuwara = await NuwaraEliyaDelivery.find({
                date: { $gte: dayStart, $lte: dayEnd }
            });
            let nuwaraDelVal = 0;
            let nuwaraRetVal = 0;
            let nuwaraNetVal = 0;
            dayNuwara.forEach(d => {
                nuwaraDelVal += (d.loadCost || 0);
                nuwaraRetVal += (d.returnsCost || 0);
                nuwaraNetVal += ((d.loadCost || 0) - (d.returnsCost || 0) - (d.onBoardStockCost || 0));
            });

            const dayLabel = current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            trendData.push({
                monthLabel: dayLabel,
                sales: (del - ret) + nuwaraNetVal,
                deliveries: del + nuwaraDelVal,
                returns: ret + nuwaraRetVal
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

            const monthNuwara = await NuwaraEliyaDelivery.find({
                date: { $gte: mStart, $lte: mEnd }
            });
            let nuwaraDelVal = 0;
            let nuwaraRetVal = 0;
            let nuwaraNetVal = 0;
            monthNuwara.forEach(d => {
                nuwaraDelVal += (d.loadCost || 0);
                nuwaraRetVal += (d.returnsCost || 0);
                nuwaraNetVal += ((d.loadCost || 0) - (d.returnsCost || 0) - (d.onBoardStockCost || 0));
            });

            const monthLabel = current.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            trendData.push({
                monthLabel,
                sales: (del - ret) + nuwaraNetVal,
                deliveries: del + nuwaraDelVal,
                returns: ret + nuwaraRetVal
            });

            current.setMonth(current.getMonth() + 1);
            current.setDate(1);
        }
    }

    res.json({
        success: true,
        data: {
            kpis: {
                monthlySales: totalPeriodSales,
                monthlyReceived: totalPeriodReceived,
                totalOutstanding,
                todaySales,
                shopCount,
                productCount
            },
            recentInvoices: combinedRecent,
            topShops: combinedShops,
            trendData
        }
    });
});

// Helper: Generate Nuwara Eliya Delivery Bill Number (e.g. NED-20260709-001)
const generateNuwaraEliyaBillNumber = async (date) => {
    const billDate = date ? new Date(date) : new Date();
    const yyyy = billDate.getFullYear();
    const mm = String(billDate.getMonth() + 1).padStart(2, '0');
    const dd = String(billDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const startOfDate = new Date(billDate);
    startOfDate.setHours(0, 0, 0, 0);
    const endOfDate = new Date(billDate);
    endOfDate.setHours(23, 59, 59, 999);

    const count = await NuwaraEliyaDelivery.countDocuments({
        date: { $gte: startOfDate, $lte: endOfDate }
    });
    const serial = String(count + 1).padStart(3, '0');
    return `NED-${dateStr}-${serial}`;
};

// ── Nuwara Eliya Delivery Controllers ─────────────────────────────────
export const getNuwaraEliyaDeliveries = asyncHandler(async (req, res) => {
    const { startDate, endDate, page = 1, limit = 15 } = req.query;
    const filter = {};

    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const count = await NuwaraEliyaDelivery.countDocuments(filter);
    const deliveries = await NuwaraEliyaDelivery.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    res.json({
        success: true,
        count,
        totalPages: Math.ceil(count / Number(limit)),
        currentPage: Number(page),
        data: deliveries
    });
});

export const getLatestNuwaraEliyaOutstanding = asyncHandler(async (req, res) => {
    const latest = await NuwaraEliyaDelivery.findOne().sort({ date: -1, createdAt: -1 });
    res.json({
        success: true,
        nextOutstanding: latest ? (latest.nextOutstanding || 0) : 0,
        onBoardStockCost: latest ? (latest.onBoardStockCost || 0) : 0,
        shopsOutstanding: latest ? (latest.shopsOutstanding || 0) : 0
    });
});

export const getNuwaraEliyaDeliveryById = asyncHandler(async (req, res) => {
    const delivery = await NuwaraEliyaDelivery.findById(req.params.id);
    if (!delivery) {
        res.status(404);
        throw new Error('Nuwara Eliya delivery record not found');
    }
    res.json({ success: true, data: delivery });
});

export const createNuwaraEliyaDelivery = asyncHandler(async (req, res) => {
    const {
        date,
        loadedItems,
        previousOutstanding,
        previousOnBoardStockCost,
        previousShopsOutstanding,
        bankDeposits,
        returnedItems,
        onBoardItems,
        shopsOutstanding,
        amountPaid,
        specialRemarks,
        structureId,
        structureName,
        status
    } = req.body;

    // Filter out loaded/returned/on-board items with qty === 0 or empty product name
    const validLoadedItems = (loadedItems || []).filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0);
    const validReturnedItems = (returnedItems || []).filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0);
    const validOnBoardItems = (onBoardItems || []).filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0);

    // Auto-save any new products in loaded, returned, or on-board items
    if (validLoadedItems.length > 0) await autoSaveProducts(validLoadedItems, req.user._id);
    if (validReturnedItems.length > 0) await autoSaveProducts(validReturnedItems, req.user._id);
    if (validOnBoardItems.length > 0) await autoSaveProducts(validOnBoardItems, req.user._id);

    const processedLoaded = validLoadedItems.map(item => ({
        productName: item.productName.trim(),
        price: Number(item.price || 0),
        qty: Number(item.qty || 0)
    }));
    const loadCost = processedLoaded.reduce((sum, item) => sum + item.qty * item.price, 0);

    const processedReturned = validReturnedItems.map(item => ({
        productName: item.productName.trim(),
        price: Number(item.price || 0),
        qty: Number(item.qty || 0)
    }));
    const returnsCost = processedReturned.reduce((sum, item) => sum + item.qty * item.price, 0);

    const processedOnBoard = validOnBoardItems.map(item => ({
        productName: item.productName.trim(),
        price: Number(item.price || 0),
        qty: Number(item.qty || 0)
    }));
    const onBoardStockCost = processedOnBoard.reduce((sum, item) => sum + item.qty * item.price, 0);

    const prevOutstanding = Number(previousOutstanding || 0);
    const prevOnBoard = Number(previousOnBoardStockCost || 0);
    const prevShops = Number(previousShopsOutstanding || 0);
    const deposits = Number(bankDeposits || 0);
    const shopOut = Number(shopsOutstanding || 0);
    const paid = Number(amountPaid || 0);

    const grossSubtotal = loadCost + prevOutstanding + prevOnBoard + prevShops;
    const netOutstanding = grossSubtotal - (deposits + returnsCost + onBoardStockCost + shopOut);
    const nextOutstanding = netOutstanding - paid;

    const billNumber = await generateNuwaraEliyaBillNumber(date);

    const delivery = await NuwaraEliyaDelivery.create({
        billNumber,
        date: date ? new Date(date) : new Date(),
        loadedItems: processedLoaded,
        loadCost,
        previousOutstanding: prevOutstanding,
        previousOnBoardStockCost: prevOnBoard,
        previousShopsOutstanding: prevShops,
        bankDeposits: deposits,
        returnedItems: processedReturned,
        returnsCost,
        onBoardItems: processedOnBoard,
        onBoardStockCost,
        shopsOutstanding: shopOut,
        netOutstanding,
        amountPaid: paid,
        nextOutstanding,
        status: status || 'loaded',
        specialRemarks: specialRemarks || '',
        structureId: structureId || null,
        structureName: structureName || '',
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: delivery });
});

export const updateNuwaraEliyaDelivery = asyncHandler(async (req, res) => {
    const {
        date,
        loadedItems,
        previousOutstanding,
        previousOnBoardStockCost,
        previousShopsOutstanding,
        bankDeposits,
        returnedItems,
        onBoardItems,
        shopsOutstanding,
        amountPaid,
        specialRemarks,
        structureId,
        structureName,
        status
    } = req.body;

    const delivery = await NuwaraEliyaDelivery.findById(req.params.id);
    if (!delivery) {
        res.status(404);
        throw new Error('Nuwara Eliya delivery record not found');
    }

    const validLoadedItems = loadedItems 
        ? loadedItems.filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0)
        : null;
    const validReturnedItems = returnedItems
        ? returnedItems.filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0)
        : null;
    const validOnBoardItems = onBoardItems
        ? onBoardItems.filter(item => item.productName && item.productName.trim() !== '' && Number(item.qty || 0) > 0)
        : null;

    if (validLoadedItems) await autoSaveProducts(validLoadedItems, req.user._id);
    if (validReturnedItems) await autoSaveProducts(validReturnedItems, req.user._id);
    if (validOnBoardItems) await autoSaveProducts(validOnBoardItems, req.user._id);

    const processedLoaded = validLoadedItems 
        ? validLoadedItems.map(item => ({
            productName: item.productName.trim(),
            price: Number(item.price || 0),
            qty: Number(item.qty || 0)
          }))
        : delivery.loadedItems;
    const loadCost = loadedItems
        ? processedLoaded.reduce((sum, item) => sum + item.qty * item.price, 0)
        : delivery.loadCost;

    const processedReturned = validReturnedItems
        ? validReturnedItems.map(item => ({
            productName: item.productName.trim(),
            price: Number(item.price || 0),
            qty: Number(item.qty || 0)
          }))
        : delivery.returnedItems;
    const returnsCost = returnedItems
        ? processedReturned.reduce((sum, item) => sum + item.qty * item.price, 0)
        : delivery.returnsCost;

    const processedOnBoard = validOnBoardItems
        ? validOnBoardItems.map(item => ({
            productName: item.productName.trim(),
            price: Number(item.price || 0),
            qty: Number(item.qty || 0)
          }))
        : delivery.onBoardItems;
    const onBoardStockCost = onBoardItems
        ? processedOnBoard.reduce((sum, item) => sum + item.qty * item.price, 0)
        : delivery.onBoardStockCost;

    const prevOutstanding = previousOutstanding !== undefined ? Number(previousOutstanding) : delivery.previousOutstanding;
    const prevOnBoard = previousOnBoardStockCost !== undefined ? Number(previousOnBoardStockCost) : delivery.previousOnBoardStockCost;
    const prevShops = previousShopsOutstanding !== undefined ? Number(previousShopsOutstanding) : delivery.previousShopsOutstanding;
    const deposits = bankDeposits !== undefined ? Number(bankDeposits) : delivery.bankDeposits;
    const shopOut = shopsOutstanding !== undefined ? Number(shopsOutstanding) : delivery.shopsOutstanding;
    const paid = amountPaid !== undefined ? Number(amountPaid) : delivery.amountPaid;

    const grossSubtotal = loadCost + prevOutstanding + prevOnBoard + prevShops;
    const netOutstanding = grossSubtotal - (deposits + returnsCost + onBoardStockCost + shopOut);
    const nextOutstanding = netOutstanding - paid;

    delivery.date = date ? new Date(date) : delivery.date;
    delivery.loadedItems = processedLoaded;
    delivery.loadCost = loadCost;
    delivery.previousOutstanding = prevOutstanding;
    delivery.previousOnBoardStockCost = prevOnBoard;
    delivery.previousShopsOutstanding = prevShops;
    delivery.bankDeposits = deposits;
    delivery.returnedItems = processedReturned;
    delivery.returnsCost = returnsCost;
    delivery.onBoardItems = processedOnBoard;
    delivery.onBoardStockCost = onBoardStockCost;
    delivery.shopsOutstanding = shopOut;
    delivery.netOutstanding = netOutstanding;
    delivery.amountPaid = paid;
    delivery.nextOutstanding = nextOutstanding;
    delivery.specialRemarks = specialRemarks !== undefined ? specialRemarks : delivery.specialRemarks;
    delivery.structureId = structureId !== undefined ? (structureId || null) : delivery.structureId;
    delivery.structureName = structureName !== undefined ? (structureName || '') : delivery.structureName;
    delivery.status = status !== undefined ? status : delivery.status;

    await delivery.save();
    res.json({ success: true, data: delivery });
});

export const deleteNuwaraEliyaDelivery = asyncHandler(async (req, res) => {
    const delivery = await NuwaraEliyaDelivery.findById(req.params.id);
    if (!delivery) {
        res.status(404);
        throw new Error('Nuwara Eliya delivery record not found');
    }

    await delivery.deleteOne();
    res.json({ success: true, message: 'Nuwara Eliya delivery record removed successfully' });
});

// ── Finance & Leases ──────────────────────────────────────────────────
export const getFinanceItems = asyncHandler(async (req, res) => {
    const { type, status, startDate, endDate } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.dueDate = {};
        if (startDate) filter.dueDate.$gte = new Date(startDate);
        if (endDate) filter.dueDate.$lte = new Date(endDate);
    }
    const items = await BakeryFinanceItem.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, count: items.length, data: items });
});

export const createFinanceItem = asyncHandler(async (req, res) => {
    const { title, type, amount, paidAmount, dueDate, paymentSourceType, paymentSourceId, chequeNumber, notes } = req.body;
    
    const item = await BakeryFinanceItem.create({
        title,
        type,
        amount: Number(amount),
        paidAmount: Number(paidAmount || 0),
        dueDate: new Date(dueDate),
        status: Number(paidAmount || 0) >= Number(amount) ? 'completed' : 'pending',
        paymentSourceType: paymentSourceType || 'none',
        paymentSourceId: paymentSourceId || null,
        chequeNumber,
        notes,
        createdBy: req.user._id
    });

    if (item.paymentSourceType === 'bank_account' && item.paymentSourceId && item.paidAmount > 0) {
        const bankAccount = await BankAccount.findById(item.paymentSourceId);
        if (bankAccount) {
            bankAccount.currentBalance -= item.paidAmount;
            await bankAccount.save();
        }
    }

    res.status(201).json({ success: true, data: item });
});

export const updateFinanceItem = asyncHandler(async (req, res) => {
    const { title, type, amount, paidAmount, dueDate, paymentSourceType, paymentSourceId, chequeNumber, notes, status } = req.body;
    const item = await BakeryFinanceItem.findById(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Finance item not found');
    }

    const prevPaidAmount = item.paidAmount;
    const prevSourceType = item.paymentSourceType;
    const prevSourceId = item.paymentSourceId;

    item.title = title || item.title;
    item.type = type || item.type;
    item.amount = amount !== undefined ? Number(amount) : item.amount;
    item.paidAmount = paidAmount !== undefined ? Number(paidAmount) : item.paidAmount;
    item.dueDate = dueDate ? new Date(dueDate) : item.dueDate;
    item.paymentSourceType = paymentSourceType !== undefined ? paymentSourceType : item.paymentSourceType;
    item.paymentSourceId = paymentSourceId !== undefined ? paymentSourceId : item.paymentSourceId;
    item.chequeNumber = chequeNumber !== undefined ? chequeNumber : item.chequeNumber;
    item.notes = notes !== undefined ? notes : item.notes;
    item.status = status || (item.paidAmount >= item.amount ? 'completed' : 'pending');

    await item.save();

    const diff = item.paidAmount - prevPaidAmount;
    
    if (prevSourceType === 'bank_account' && prevSourceId && prevPaidAmount > 0) {
        if (item.paymentSourceType !== 'bank_account' || String(item.paymentSourceId) !== String(prevSourceId)) {
            const prevBank = await BankAccount.findById(prevSourceId);
            if (prevBank) {
                prevBank.currentBalance += prevPaidAmount;
                await prevBank.save();
            }
            if (item.paymentSourceType === 'bank_account' && item.paymentSourceId && item.paidAmount > 0) {
                const newBank = await BankAccount.findById(item.paymentSourceId);
                if (newBank) {
                    newBank.currentBalance -= item.paidAmount;
                    await newBank.save();
                }
            }
        } else if (diff !== 0) {
            const bank = await BankAccount.findById(item.paymentSourceId);
            if (bank) {
                bank.currentBalance -= diff;
                await bank.save();
            }
        }
    } else if (item.paymentSourceType === 'bank_account' && item.paymentSourceId && diff !== 0) {
        const bank = await BankAccount.findById(item.paymentSourceId);
        if (bank) {
            bank.currentBalance -= diff;
            await bank.save();
        }
    }

    res.json({ success: true, data: item });
});

export const deleteFinanceItem = asyncHandler(async (req, res) => {
    const item = await BakeryFinanceItem.findById(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Finance item not found');
    }

    if (item.paymentSourceType === 'bank_account' && item.paymentSourceId && item.paidAmount > 0) {
        const bank = await BankAccount.findById(item.paymentSourceId);
        if (bank) {
            bank.currentBalance += item.paidAmount;
            await bank.save();
        }
    }

    await item.deleteOne();
    res.json({ success: true, message: 'Finance item deleted successfully' });
});

export const autoAllocateBakeryIncome = asyncHandler(async (req, res) => {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
        res.status(400);
        throw new Error('Amount must be greater than zero');
    }

    let remainingIncome = Number(amount);
    const pendingItems = await BakeryFinanceItem.find({ status: 'pending' }).sort({ dueDate: 1 });
    const updatedItems = [];

    for (const item of pendingItems) {
        if (remainingIncome <= 0) break;

        const needed = item.amount - item.paidAmount;
        const allocate = Math.min(needed, remainingIncome);

        item.paidAmount += allocate;
        remainingIncome -= allocate;

        if (item.paidAmount >= item.amount) {
            item.status = 'completed';
        }
        await item.save();
        updatedItems.push(item);
    }

    res.json({
        success: true,
        allocatedAmount: Number(amount) - remainingIncome,
        remainingAmount: remainingIncome,
        updatedCount: updatedItems.length,
        data: updatedItems
    });
});

