import asyncHandler from 'express-async-handler';
import BankAccount from '../models/BankAccount.js';

export const createBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: account });
});

export const getBankAccounts = asyncHandler(async (req, res) => {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive) filter.isActive = isActive === 'true';

    const accounts = await BankAccount.find(filter).sort({ accountName: 1 });
    res.json({ success: true, data: accounts });
});

export const updateBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!account) { res.status(404); throw new Error('Account not found'); }
    res.json({ success: true, data: account });
});

export const deleteBankAccount = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) { res.status(404); throw new Error('Account not found'); }
    
    // Check if account has transactions before deleting? 
    // For now, soft delete or just delete.
    await account.deleteOne();
    res.json({ success: true, message: 'Account deleted' });
});

export const getBankAccountById = asyncHandler(async (req, res) => {
    const account = await BankAccount.findById(req.params.id);
    if (!account) { res.status(404); throw new Error('Account not found'); }
    res.json({ success: true, data: account });
});
