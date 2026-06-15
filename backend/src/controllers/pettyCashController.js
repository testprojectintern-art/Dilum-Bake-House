import asyncHandler from 'express-async-handler';
import PettyCashTransaction from '../models/PettyCashTransaction.js';

/**
 * POST /api/petty-cash
 * Record a new Petty Cash Transaction (top-up or expense)
 */
export const recordPettyCashTransaction = asyncHandler(async (req, res) => {
    const { date, transactionType, amount, category, description, reference } = req.body;

    if (!amount || amount <= 0) {
        res.status(400);
        throw new Error('Valid transaction amount is required');
    }

    // Check balance before allowing an expense
    if (transactionType === 'expense') {
        const balanceData = await calculateBalance();
        if (amount > balanceData.balance) {
            res.status(400);
            throw new Error(`Insufficient petty cash balance. Available: LKR ${balanceData.balance.toFixed(2)}, Requested: LKR ${amount.toFixed(2)}`);
        }
    }

    const transaction = await PettyCashTransaction.create({
        date: date || new Date(),
        transactionType,
        amount: Number(amount),
        category: category.trim(),
        description: description?.trim(),
        reference: reference?.trim(),
        createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: transaction });
});

/**
 * GET /api/petty-cash
 * List all transactions
 */
export const getPettyCashTransactions = asyncHandler(async (req, res) => {
    const { startDate, endDate, transactionType, category } = req.query;
    const filter = {};

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    if (transactionType) filter.transactionType = transactionType;
    if (category) filter.category = category;

    const transactions = await PettyCashTransaction.find(filter)
        .populate('createdBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 });

    const balanceData = await calculateBalance();

    res.json({
        success: true,
        data: {
            balance: balanceData.balance,
            totalFunds: balanceData.totalFunds,
            totalExpenses: balanceData.totalExpenses,
            transactions
        }
    });
});

/**
 * GET /api/petty-cash/balance
 * Get current petty cash balance
 */
export const getPettyCashBalance = asyncHandler(async (req, res) => {
    const balanceData = await calculateBalance();
    res.json({ success: true, data: balanceData });
});

/**
 * DELETE /api/petty-cash/:id
 * Delete (void) a transaction
 */
export const deletePettyCashTransaction = asyncHandler(async (req, res) => {
    const transaction = await PettyCashTransaction.findById(req.params.id);
    if (!transaction) {
        res.status(404);
        throw new Error('Transaction not found');
    }
    
    transaction.deletedAt = new Date();
    await transaction.save();
    
    res.json({ success: true, message: 'Transaction deleted (voided)' });
});

/**
 * Helper function to calculate petty cash balance dynamically
 */
async function calculateBalance() {
    const agg = await PettyCashTransaction.aggregate([
        { $match: { deletedAt: null } },
        {
            $group: {
                _id: null,
                totalFunds: {
                    $sum: {
                        $cond: [{ $eq: ['$transactionType', 'fund'] }, '$amount', 0]
                    }
                },
                totalExpenses: {
                    $sum: {
                        $cond: [{ $eq: ['$transactionType', 'expense'] }, '$amount', 0]
                    }
                }
            }
        }
    ]);

    const totalFunds = agg[0]?.totalFunds || 0;
    const totalExpenses = agg[0]?.totalExpenses || 0;
    const balance = totalFunds - totalExpenses;

    return {
        balance: +balance.toFixed(2),
        totalFunds: +totalFunds.toFixed(2),
        totalExpenses: +totalExpenses.toFixed(2)
    };
}
