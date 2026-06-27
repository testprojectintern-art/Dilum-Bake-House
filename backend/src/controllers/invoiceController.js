import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import SalesOrder from '../models/SalesOrder.js';
import SerialNumber from '../models/SerialNumber.js';
import { increaseStock } from '../services/stockService.js';
import Warehouse from '../models/Warehouse.js';

/**
 * Helper: recalculate customer credit balance
 */
const updateCustomerBalance = async (customerId, session) => {
    const result = await Invoice.aggregate([
        {
            $match: {
                customerId: new mongoose.Types.ObjectId(customerId),
                paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] },
                deletedAt: null,
            },
        },
        {
            $group: {
                _id: null,
                totalBalance: { $sum: '$balanceDue' },
                overdueAmount: {
                    $sum: {
                        $cond: [{ $in: ['$paymentStatus', ['overdue']] }, '$balanceDue', 0],
                    },
                },
            },
        },
    ]).session(session || null);

    const summary = result[0] || { totalBalance: 0, overdueAmount: 0 };

    const customer = await Customer.findById(customerId).session(session || null);
    if (customer) {
        customer.creditStatus.currentBalance = +summary.totalBalance.toFixed(2);
        customer.creditStatus.overdueAmount = +summary.overdueAmount.toFixed(2);
        customer.creditStatus.isOverdue = summary.overdueAmount > 0;
        customer.creditStatus.availableCredit = Math.max(
            0,
            (customer.paymentTerms?.creditLimit || 0) - customer.creditStatus.currentBalance
        );
        await customer.save({ session: session || undefined });
    }
};

/**
 * POST /api/invoices
 * Create manual invoice
 */
export const createInvoice = asyncHandler(async (req, res) => {
    const { customerId, items, dueDate, ...rest } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) { res.status(404); throw new Error('Customer not found'); }

    // Auto-calc due date if not provided
    let finalDueDate = dueDate;
    if (!finalDueDate && customer.paymentTerms?.type === 'credit') {
        const d = new Date(rest.invoiceDate || Date.now());
        d.setDate(d.getDate() + (customer.paymentTerms.creditDays || 0));
        finalDueDate = d;
    }

    // Validate serial numbers if provided
    for (const item of items) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
            if (item.serialNumbers.length !== Number(item.quantity)) {
                res.status(400);
                throw new Error(`Quantity (${item.quantity}) for product does not match the number of serial numbers supplied (${item.serialNumbers.length})`);
            }
            for (const sn of item.serialNumbers) {
                const snObj = await SerialNumber.findOne({ serialNumber: sn.toUpperCase().trim(), productId: item.productId });
                if (!snObj || snObj.status !== 'in_stock') {
                    res.status(400);
                    throw new Error(`Serial number '${sn}' is not in stock or does not match this product`);
                }
            }
        }
    }

    const invoice = new Invoice({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
        },
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddresses?.find((a) => a.isDefault) || customer.billingAddress,
        salesRepId: customer.assignedSalesRep,
        paymentTerms: {
            type: customer.paymentTerms?.type || 'cod',
            creditDays: customer.paymentTerms?.creditDays || 0,
        },
        dueDate: finalDueDate,
        items,
        ...rest,
        createdBy: req.user._id,
    });

    await invoice.save();

    // Mark serial numbers as sold
    for (const item of invoice.items) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
            for (const sn of item.serialNumbers) {
                await SerialNumber.updateOne(
                    { serialNumber: sn.toUpperCase().trim() },
                    { 
                        status: 'sold', 
                        invoiceId: invoice._id,
                        warrantyExpiryDate: new Date(new Date(invoice.invoiceDate).setFullYear(new Date(invoice.invoiceDate).getFullYear() + 1))
                    }
                );
            }
        }
    }

    await updateCustomerBalance(customer._id);

    const populated = await Invoice.findById(invoice._id)
        .populate('customerId', 'displayName customerCode')
        .populate('salesOrderIds', 'orderNumber');

    res.status(201).json({ success: true, data: populated });
});

/**
 * Core Logic: Generate an invoice from one or more delivered/approved sales orders
 */
export const generateInvoiceFromOrders = async ({
    salesOrderIds,
    invoiceDate,
    invoiceType = 'standard',
    notes,
    createdBy,
    status = 'approved',
    session,
}) => {
    const orders = await SalesOrder.find({
        _id: { $in: salesOrderIds },
        // POS orders might be 'approved' but not yet 'delivered' in the system sense, 
        // but for POS they are effectively delivered.
        status: { $in: ['approved', 'dispatched', 'delivered', 'completed'] },
    }).populate('customerId').session(session || null);

    if (orders.length === 0) {
        throw new Error('No valid orders found for invoicing');
    }

    const customer = orders[0].customerId;

    // Merge line items
    const invoiceItems = [];
    orders.forEach((order) => {
        order.items.forEach((orderItem) => {
            const qty = orderItem.deliveredQuantity || orderItem.orderedQuantity;
            if (qty <= 0) return;
            invoiceItems.push({
                productId: orderItem.productId,
                productCode: orderItem.productCode,
                productName: orderItem.productName,
                description: orderItem.description,
                quantity: qty,
                unitOfMeasure: orderItem.unitOfMeasure,
                unitPrice: orderItem.unitPrice,
                discountPercent: orderItem.discountPercent,
                taxRate: orderItem.taxRate,
                taxable: orderItem.taxable,
                salesOrderLineId: orderItem._id,
                serialNumbers: orderItem.serialNumbers || [],
            });
        });
    });

    const d = new Date(invoiceDate || Date.now());
    if (customer.paymentTerms?.type === 'credit') {
        d.setDate(d.getDate() + (customer.paymentTerms.creditDays || 0));
    }

    const invoice = new Invoice({
        customerId: customer._id,
        customerSnapshot: {
            name: customer.displayName,
            code: customer.customerCode,
            taxRegistrationNumber: customer.taxRegistrationNumber,
            contactName: customer.primaryContact?.name,
            phone: customer.primaryContact?.phone,
        },
        billingAddress: customer.billingAddress,
        shippingAddress: orders[0].shippingAddress || customer.billingAddress,
        salesOrderIds: orders.map((o) => o._id),
        salesOrderNumbers: orders.map((o) => o.orderNumber),
        invoiceType,
        invoiceDate: invoiceDate || new Date(),
        dueDate: customer.paymentTerms?.type === 'credit' ? d : undefined,
        salesRepId: orders[0].salesRepId,
        paymentTerms: {
            type: customer.paymentTerms?.type || 'cod',
            creditDays: customer.paymentTerms?.creditDays || 0,
        },
        items: invoiceItems,
        orderDiscount: orders[0].orderDiscount,
        giftWrap: orders[0].giftWrap || false,
        giftWrapFee: orders[0].giftWrapFee || 0,
        engravingText: orders[0].engravingText || '',
        notes,
        status,
        createdBy,
    });

    await invoice.save({ session: session || undefined });

    // Mark serial numbers as sold
    for (const item of invoice.items) {
        if (item.serialNumbers && item.serialNumbers.length > 0) {
            for (const sn of item.serialNumbers) {
                await SerialNumber.updateOne(
                    { serialNumber: sn.toUpperCase().trim() },
                    { 
                        status: 'sold', 
                        invoiceId: invoice._id,
                        warrantyExpiryDate: new Date(new Date(invoice.invoiceDate).setFullYear(new Date(invoice.invoiceDate).getFullYear() + 1))
                    },
                    { session }
                );
            }
        }
    }

    // Update sales orders to "invoiced"
    for (const order of orders) {
        order.status = 'invoiced';
        await order.save({ session: session || undefined });
    }

    await updateCustomerBalance(customer._id, session);
    return invoice;
};

/**
 * POST /api/invoices/from-sales-order
 * Generate an invoice from one or more delivered sales orders
 */
export const createFromSalesOrder = asyncHandler(async (req, res) => {
    const { salesOrderIds, invoiceDate, invoiceType = 'standard', notes } = req.body;

    try {
        const invoice = await generateInvoiceFromOrders({
            salesOrderIds,
            invoiceDate,
            invoiceType,
            notes,
            createdBy: req.user._id,
        });

        const populated = await Invoice.findById(invoice._id)
            .populate('customerId', 'displayName customerCode')
            .populate('salesOrderIds', 'orderNumber');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message);
    }
});

/**
 * Helper to dynamically calculate and update aging details for unpaid invoices
 */
export const updateInvoiceAging = async () => {
    const unpaidInvoices = await Invoice.find({
        paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] },
        deletedAt: null
    });
    
    const now = new Date();
    const bulkOps = [];
    const customerIdsToUpdate = new Set();
    
    for (const inv of unpaidInvoices) {
        if (!inv.dueDate) continue;
        
        const daysPast = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
        const currentDaysPastDue = Math.max(0, daysPast);
        
        let currentPaymentStatus = inv.paymentStatus;
        if (currentDaysPastDue > 0 && inv.paymentStatus === 'unpaid') {
            currentPaymentStatus = 'overdue';
        }
        
        let currentAgingBucket = 'current';
        if (currentDaysPastDue === 0) currentAgingBucket = 'current';
        else if (currentDaysPastDue <= 30) currentAgingBucket = '1_30';
        else if (currentDaysPastDue <= 60) currentAgingBucket = '31_60';
        else if (currentDaysPastDue <= 90) currentAgingBucket = '61_90';
        else currentAgingBucket = '91_plus';
        
        if (inv.daysPastDue !== currentDaysPastDue || 
            inv.paymentStatus !== currentPaymentStatus || 
            inv.agingBucket !== currentAgingBucket) {
            
            bulkOps.push({
                updateOne: {
                    filter: { _id: inv._id },
                    update: {
                        $set: {
                            daysPastDue: currentDaysPastDue,
                            paymentStatus: currentPaymentStatus,
                            agingBucket: currentAgingBucket
                        }
                    }
                }
            });
            customerIdsToUpdate.add(inv.customerId.toString());
        }
    }
    
    if (bulkOps.length > 0) {
        await Invoice.bulkWrite(bulkOps);
        for (const cid of customerIdsToUpdate) {
            await updateCustomerBalance(cid);
        }
    }
};

/**
 * GET /api/invoices
 */
export const getInvoices = asyncHandler(async (req, res) => {
    await updateInvoiceAging();
    const {
        search, customerId, paymentStatus, status, agingBucket,
        startDate, endDate,
        page = 1, limit = 20,
        sortBy = 'invoiceDate', sortOrder = 'desc',
        salesOrderId
    } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
            { 'customerSnapshot.code': { $regex: search, $options: 'i' } },
        ];
    }
    if (customerId) filter.customerId = customerId;
    if (salesOrderId) filter.salesOrderIds = salesOrderId;
    if (paymentStatus) {
        // Support comma-separated values: "unpaid,partially_paid,overdue"
        const statuses = paymentStatus.split(',').map((s) => s.trim()).filter(Boolean);
        filter.paymentStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (status) filter.status = status;
    if (agingBucket) filter.agingBucket = agingBucket;
    if (startDate || endDate) {
        filter.invoiceDate = {};
        if (startDate) filter.invoiceDate.$gte = new Date(startDate);
        if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [invoices, total] = await Promise.all([
        Invoice.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('salesOrderIds', 'orderNumber')
            .sort(sortObj).skip(skip).limit(Number(limit)),
        Invoice.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: invoices.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: invoices,
    });
});

/**
 * GET /api/invoices/:id
 */
export const getInvoiceById = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id)
        .populate('customerId', 'displayName customerCode taxRegistrationNumber primaryContact paymentTerms creditStatus')
        .populate('salesOrderIds', 'orderNumber orderDate')
        .populate('salesRepId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('cancelledBy', 'firstName lastName');
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    res.json({ success: true, data: invoice });
});

/**
 * GET /api/invoices/aging/summary
 * Accounts receivable aging summary
 */
export const getAgingSummary = asyncHandler(async (req, res) => {
    await updateInvoiceAging();
    const { customerId } = req.query;
    const match = {
        paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] },
        deletedAt: null,
    };
    if (customerId) match.customerId = new mongoose.Types.ObjectId(customerId);

    const aggregation = await Invoice.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$agingBucket',
                count: { $sum: 1 },
                total: { $sum: '$balanceDue' },
            },
        },
    ]);

    const buckets = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '91_plus': 0 };
    const counts = { ...buckets };
    aggregation.forEach((row) => {
        if (row._id in buckets) {
            buckets[row._id] = row.total;
            counts[row._id] = row.count;
        }
    });

    const totalOutstanding = Object.values(buckets).reduce((s, v) => s + v, 0);

    res.json({
        success: true,
        data: { buckets, counts, totalOutstanding },
    });
});

/**
 * PATCH /api/invoices/:id/status
 */
export const changeInvoiceStatus = asyncHandler(async (req, res) => {
    const { status, reason, restock } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }

    const allowed = {
        draft: ['approved', 'cancelled'],
        approved: ['sent', 'cancelled'],
        sent: ['viewed', 'cancelled'],
        viewed: ['cancelled'],
        paid: ['void'],
    };

    if (!allowed[invoice.status]?.includes(status)) {
        res.status(400);
        throw new Error(`Cannot change status from '${invoice.status}' to '${status}'`);
    }

    invoice.status = status;
    invoice.updatedBy = req.user._id;

    if (status === 'sent') invoice.sentAt = new Date();
    if (status === 'cancelled' || status === 'void') {
        invoice.cancelledBy = req.user._id;
        invoice.cancelledAt = new Date();
        invoice.cancellationReason = reason;
        invoice.paymentStatus = 'cancelled';
        
        // Return serial numbers back to in_stock
        await SerialNumber.updateMany(
            { invoiceId: invoice._id },
            { $set: { status: 'in_stock', invoiceId: null, warrantyExpiryDate: null } }
        );

        // Restocking logic
        if (restock) {
            let warehouseId = null;
            if (invoice.salesOrderIds && invoice.salesOrderIds.length > 0) {
                const order = await SalesOrder.findById(invoice.salesOrderIds[0]);
                if (order) {
                    warehouseId = order.sourceWarehouseId;
                }
            }
            if (!warehouseId) {
                const defaultWarehouse = await Warehouse.findOne();
                if (defaultWarehouse) {
                    warehouseId = defaultWarehouse._id;
                }
            }

            if (warehouseId) {
                for (const item of invoice.items) {
                    if (item.productId) {
                        await increaseStock({
                            productId: item.productId,
                            warehouseId,
                            quantity: item.quantity,
                            costPerUnit: item.unitPrice,
                            movementType: 'sale_return',
                            sourceDocument: {
                                type: invoice.salesOrderIds?.length > 0 ? 'sales_order' : 'manual',
                                id: invoice.salesOrderIds?.length > 0 ? invoice.salesOrderIds[0] : invoice._id,
                                number: invoice.invoiceNumber,
                            },
                            reason: `Restocked from cancelled invoice ${invoice.invoiceNumber}. Reason: ${reason || 'N/A'}`,
                            userId: req.user._id,
                        });
                    }
                }
            }
        }
    }

    await invoice.save();
    await updateCustomerBalance(invoice.customerId);

    res.json({ success: true, data: invoice });
});

/**
 * DELETE /api/invoices/:id
 */
export const deleteInvoice = asyncHandler(async (req, res) => {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) { res.status(404); throw new Error('Invoice not found'); }
    if (invoice.status !== 'draft') {
        res.status(400); throw new Error('Only draft invoices can be deleted');
    }
    invoice.deletedAt = new Date();
    await invoice.save();
    res.json({ success: true, message: 'Draft invoice deleted' });
});

// Exported for use by payments module
export { updateCustomerBalance };