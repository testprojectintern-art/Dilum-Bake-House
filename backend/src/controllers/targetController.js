import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Target from '../models/Target.js';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

/**
 * POST /api/targets
 * Create or Update a Target
 */
export const saveTarget = asyncHandler(async (req, res) => {
    const { targetType, year, month, productId, targetAmount, notes } = req.body;

    const filter = {
        targetType,
        year,
        month: targetType === 'monthly' ? month : undefined,
        productId: productId || null
    };

    const update = {
        targetAmount,
        notes,
        createdBy: req.user._id
    };

    const target = await Target.findOneAndUpdate(
        filter,
        { ...filter, ...update },
        { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: target });
});

/**
 * GET /api/targets
 * List all targets
 */
export const getTargets = asyncHandler(async (req, res) => {
    const { targetType, year, month, productId } = req.query;
    const filter = {};

    if (targetType) filter.targetType = targetType;
    if (year) filter.year = Number(year);
    if (month) filter.month = Number(month);
    if (productId) filter.productId = productId;

    const targets = await Target.find(filter)
        .populate('productId', 'name productCode basePrice')
        .sort({ year: -1, month: -1 });

    res.json({ success: true, data: targets });
});

/**
 * DELETE /api/targets/:id
 * Delete a target
 */
export const deleteTarget = asyncHandler(async (req, res) => {
    const target = await Target.findById(req.params.id);
    if (!target) {
        res.status(404);
        throw new Error('Target not found');
    }
    await target.deleteOne();
    res.json({ success: true, message: 'Target deleted successfully' });
});

/**
 * GET /api/targets/progress
 * Get targets progress (Target vs Actual Sales)
 */
export const getTargetsProgress = asyncHandler(async (req, res) => {
    const { year, month, targetType } = req.query;
    
    const queryYear = year ? Number(year) : new Date().getFullYear();
    const queryMonth = month ? Number(month) : new Date().getMonth() + 1;
    const type = targetType || 'monthly';

    const filter = { targetType: type, year: queryYear };
    if (type === 'monthly') {
        filter.month = queryMonth;
    }

    const targets = await Target.find(filter).populate('productId', 'name productCode');

    // Calculate progress dates
    let start, end;
    if (type === 'monthly') {
        start = new Date(queryYear, queryMonth - 1, 1);
        end = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);
    } else {
        start = new Date(queryYear, 0, 1);
        end = new Date(queryYear, 11, 31, 23, 59, 59, 999);
    }

    const progressData = [];

    for (const target of targets) {
        let actualSales = 0;

        if (target.productId) {
            // Product specific sales
            const result = await Invoice.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        status: 'approved',
                        invoiceDate: { $gte: start, $lte: end }
                    }
                },
                { $unwind: '$items' },
                {
                    $match: {
                        'items.productId': target.productId._id
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$items.lineTotal' }
                    }
                }
            ]);
            actualSales = result[0]?.totalSales || 0;
        } else {
            // General business sales
            const result = await Invoice.aggregate([
                {
                    $match: {
                        deletedAt: null,
                        status: 'approved',
                        invoiceDate: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$grandTotal' }
                    }
                }
            ]);
            actualSales = result[0]?.totalSales || 0;
        }

        const percentage = target.targetAmount > 0 
            ? +((actualSales / target.targetAmount) * 100).toFixed(1)
            : 0;

        progressData.push({
            _id: target._id,
            targetType: target.targetType,
            year: target.year,
            month: target.month,
            targetAmount: target.targetAmount,
            actualAmount: +actualSales.toFixed(2),
            percentage,
            product: target.productId ? {
                id: target.productId._id,
                name: target.productId.name,
                code: target.productId.productCode
            } : null,
            notes: target.notes
        });
    }

    res.json({
        success: true,
        data: {
            period: { start, end, year: queryYear, month: queryMonth, type },
            targets: progressData
        }
    });
});
