import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Search, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const CATEGORY_SUGGESTIONS = [
    'Office Supplies',
    'Refreshments / Snacks',
    'Transport / Fuel',
    'Courier & Shipping',
    'Minor Repairs',
    'Cleaning supplies',
    'Internet / Phone Reload',
    'Cash Top-Up',
    'General / Other'
];

export default function PettyCashPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deletingTx, setDeletingTx] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        transactionType: '',
        category: ''
    });

    // Form state
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        transactionType: 'expense',
        amount: '',
        category: '',
        reference: '',
        description: ''
    });

    // Fetch petty cash data
    const { data: pettyCashRes, isLoading } = useQuery({
        queryKey: ['pettyCash', filters],
        queryFn: async () => {
            const res = await axios.get('/petty-cash', { params: filters });
            return res.data;
        }
    });

    const pettyCash = pettyCashRes?.data || { balance: 0, totalFunds: 0, totalExpenses: 0, transactions: [] };

    // Record transaction mutation
    const recordTxMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post('/petty-cash', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Petty cash transaction recorded');
            queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
            setIsAddOpen(false);
            setForm({
                date: new Date().toISOString().split('T')[0],
                transactionType: 'expense',
                amount: '',
                category: '',
                reference: '',
                description: ''
            });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to record transaction');
        }
    });

    // Delete transaction mutation
    const deleteTxMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axios.delete(`/petty-cash/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Transaction voided successfully');
            queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
            setDeletingTx(null);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!form.category.trim()) {
            toast.error('Please specify a category');
            return;
        }

        const payload = {
            ...form,
            amount: parseFloat(form.amount)
        };

        recordTxMutation.mutate(payload);
    };

    const handleTypeChange = (type) => {
        setForm(f => ({
            ...f,
            transactionType: type,
            category: type === 'fund' ? 'Cash Top-Up' : ''
        }));
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const columns = [
        { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' }) },
        { 
            key: 'transactionType', 
            label: 'Type', 
            render: (r) => (
                <Badge variant={r.transactionType === 'fund' ? 'success' : 'danger'}>
                    {r.transactionType === 'fund' ? 'Top-Up / In' : 'Expense / Out'}
                </Badge>
            ) 
        },
        { key: 'category', label: 'Category', render: (r) => <span className="font-semibold text-gray-800">{r.category}</span> },
        { 
            key: 'amount', 
            label: 'Amount', 
            render: (r) => (
                <span className={`font-bold ${r.transactionType === 'fund' ? 'text-green-600' : 'text-rose-600'}`}>
                    {r.transactionType === 'fund' ? '+' : '-'}{fmt(r.amount)}
                </span>
            ) 
        },
        { key: 'reference', label: 'Reference / Voucher', render: (r) => <span className="text-gray-500 font-mono text-xs">{r.reference || '—'}</span> },
        { key: 'description', label: 'Description', render: (r) => <span className="text-gray-500 text-xs truncate max-w-[200px] block">{r.description || '—'}</span> },
        { key: 'createdBy', label: 'Recorded By', render: (r) => <span className="text-xs">{r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : 'System'}</span> },
        {
            key: 'actions',
            label: 'Actions',
            width: '60px',
            render: (r) => (
                <button
                    onClick={() => setDeletingTx(r)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                    title="Void Transaction"
                >
                    <Trash2 size={15} />
                </button>
            )
        }
    ];

    return (
        <div>
            <PageHeader 
                title="Petty Cash Management" 
                description="Manage minor cash expenses, record register top-ups, and review the cash drawer ledger"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="primary" onClick={() => setIsAddOpen(true)}>
                            <Plus size={16} className="mr-1.5" /> Record Transaction
                        </Button>
                    </div>
                }
            />

            {/* Balances Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="p-6 border-l-4 border-l-indigo-600 flex justify-between items-center bg-gradient-to-r from-indigo-50/20 to-white">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Petty Cash Balance</p>
                        <h2 className="text-2xl font-black text-gray-900 mt-1">{fmt(pettyCash.balance)}</h2>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Wallet size={24} /></div>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-600 flex justify-between items-center bg-gradient-to-r from-green-50/20 to-white">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cash-In (Top-ups)</p>
                        <h2 className="text-xl font-bold text-gray-900 mt-1">{fmt(pettyCash.totalFunds)}</h2>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><ArrowUpRight size={24} /></div>
                </Card>

                <Card className="p-6 border-l-4 border-l-rose-600 flex justify-between items-center bg-gradient-to-r from-rose-50/20 to-white">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cash-Out (Expenses)</p>
                        <h2 className="text-xl font-bold text-gray-900 mt-1">{fmt(pettyCash.totalExpenses)}</h2>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownRight size={24} /></div>
                </Card>
            </div>

            {/* Filter Panel */}
            <Card className="p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-full sm:w-40">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            value={filters.startDate}
                            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            value={filters.endDate}
                            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Transaction Type</label>
                        <Select
                            placeholder="All Types"
                            options={[
                                { value: 'fund', label: 'Top-Up (Cash In)' },
                                { value: 'expense', label: 'Expense (Cash Out)' }
                            ]}
                            value={filters.transactionType}
                            onChange={(e) => setFilters(f => ({ ...f, transactionType: e.target.value }))}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                        <Select
                            placeholder="All Categories"
                            options={CATEGORY_SUGGESTIONS.map(c => ({ value: c, label: c }))}
                            value={filters.category}
                            onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                        />
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters({ startDate: '', endDate: '', transactionType: '', category: '' })}
                    >
                        Clear Filters
                    </Button>
                </div>
            </Card>

            {/* Ledger Table */}
            <Card>
                {isLoading ? (
                    <div className="py-20 text-center text-gray-500">Loading ledger logs...</div>
                ) : pettyCash.transactions.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <DollarSign size={40} className="mx-auto mb-2 opacity-35" />
                        <p className="text-sm font-semibold">No transactions found in this period</p>
                    </div>
                ) : (
                    <Table columns={columns} data={pettyCash.transactions} />
                )}
            </Card>

            {/* Add Transaction Modal */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Record Cash Transaction" size="md">
                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction Direction</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('expense')}
                                    className={`py-3 border rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${form.transactionType === 'expense' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                                >
                                    <ArrowDownRight size={18} /> Cash Out (Expense)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('fund')}
                                    className={`py-3 border rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${form.transactionType === 'fund' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                                >
                                    <ArrowUpRight size={18} /> Cash In (Top-Up)
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Date"
                                type="date"
                                required
                                value={form.date}
                                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                            <Input
                                label="Amount (LKR)"
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                            />
                        </div>

                        {form.transactionType === 'expense' ? (
                            <Select
                                label="Category"
                                required
                                options={CATEGORY_SUGGESTIONS.filter(c => c !== 'Cash Top-Up').map(c => ({ value: c, label: c }))}
                                value={form.category}
                                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                            />
                        ) : (
                            <Input
                                label="Category"
                                disabled
                                value={form.category}
                            />
                        )}

                        <Input
                            label="Reference (Voucher # / Receipt #)"
                            placeholder="e.g. PCV-0012, REC-482"
                            value={form.reference}
                            onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
                        />

                        <Input
                            label="Description / Purpose"
                            placeholder="Explain the purpose of this transaction..."
                            value={form.description}
                            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        />

                        {form.transactionType === 'expense' && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2 items-start">
                                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                <p>Recording a cash-out transaction will verify if the petty cash drawer contains sufficient balance. Insufficient balances will block the transaction.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={recordTxMutation.isPending}>Record Transaction</Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Void Dialog */}
            <ConfirmDialog
                isOpen={!!deletingTx}
                onClose={() => setDeletingTx(null)}
                onConfirm={() => deleteTxMutation.mutate(deletingTx._id)}
                title="Void Transaction"
                message={`Are you sure you want to void this petty cash transaction? This will restore the spent balance or deduct the topped-up fund.`}
                variant="danger"
            />
        </div>
    );
}
