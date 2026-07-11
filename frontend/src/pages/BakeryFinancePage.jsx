import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Trash2, Calendar, DollarSign, CheckCircle2, AlertTriangle,
    Coins, Building2, Fuel, CreditCard, ChevronRight, Landmark, ArrowRight, Sparkles, RefreshCw,
    ShieldCheck, FileCheck, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';

import {
    useBakeryFinanceItems,
    useCreateBakeryFinanceItem,
    useUpdateBakeryFinanceItem,
    useDeleteBakeryFinanceItem,
    useAutoAllocateBakeryIncome,
    useBakeryShops,
    useBakeryInvoices
} from '../features/bakery/useBakery';

export default function BakeryFinancePage() {
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [payingItem, setPayingItem] = useState(null);

    // Auto-allocate states
    const [autoAllocAmount, setAutoAllocAmount] = useState('');

    // Pay Modal states
    const [payAmountInput, setPayAmountInput] = useState('');
    const [paySourceType, setPaySourceType] = useState('none');
    const [paySourceId, setPaySourceId] = useState('');

    // Form fields
    const [title, setTitle] = useState('');
    const [type, setType] = useState('other');
    const [amount, setAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('0');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentSourceType, setPaymentSourceType] = useState('none');
    const [paymentSourceId, setPaymentSourceId] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [notes, setNotes] = useState('');

    // Queries
    const { data: financeRes, isLoading } = useBakeryFinanceItems();
    const financeItems = financeRes?.data || [];

    const { data: shopsRes } = useBakeryShops();
    const shops = shopsRes?.data || [];

    const { data: invoicesRes } = useBakeryInvoices({ limit: 100 });
    const invoices = invoicesRes?.data || [];

    const { data: bankAccountsRes } = useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            const { data } = await api.get('/bank-accounts');
            return data;
        }
    });
    const bankAccounts = bankAccountsRes?.data || [];

    // Mutations
    const createItem = useCreateBakeryFinanceItem();
    const updateItem = useUpdateBakeryFinanceItem();
    const deleteItem = useDeleteBakeryFinanceItem();
    const autoAllocate = useAutoAllocateBakeryIncome();

    // Calculations for KPIs
    const totalLiabilities = financeItems
        .filter(item => item.status === 'pending')
        .reduce((sum, item) => sum + (item.amount - item.paidAmount), 0);

    const pendingCheques = financeItems
        .filter(item => item.type === 'piti_cheque' && item.status === 'pending')
        .reduce((sum, item) => sum + (item.amount - item.paidAmount), 0);

    const pendingFinance = financeItems
        .filter(item => item.type === 'vehicle_finance' && item.status === 'pending')
        .reduce((sum, item) => sum + (item.amount - item.paidAmount), 0);

    // Calculate Average Daily Income from Bakery Invoices (last 30 days)
    const dailyInvoicePayments = invoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);
    const uniqueDays = [...new Set(invoices.map(inv => new Date(inv.date).toDateString()))].length || 1;
    const avgDailyIncome = dailyInvoicePayments / uniqueDays;

    // Today's total collected shop payments
    const todayStr = new Date().toDateString();
    const todayIncome = invoices
        .filter(inv => new Date(inv.date).toDateString() === todayStr)
        .reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);

    // Expiring in 2 days alert items
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const alertItems = financeItems.filter(item => {
        return item.status === 'pending' && new Date(item.dueDate) <= twoDaysFromNow;
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(val || 0);
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setTitle('');
        setType('other');
        setAmount('');
        setPaidAmount('0');
        setDueDate(new Date().toISOString().split('T')[0]);
        setPaymentSourceType('none');
        setPaymentSourceId('');
        setChequeNumber('');
        setNotes('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setTitle(item.title);
        setType(item.type);
        setAmount(String(item.amount));
        setPaidAmount(String(item.paidAmount));
        setDueDate(new Date(item.dueDate).toISOString().split('T')[0]);
        setPaymentSourceType(item.paymentSourceType || 'none');
        setPaymentSourceId(item.paymentSourceId || '');
        setChequeNumber(item.chequeNumber || '');
        setNotes(item.notes || '');
        setIsFormOpen(true);
    };

    const handleOpenPay = (item) => {
        setPayingItem(item);
        setPayAmountInput(String(item.amount - item.paidAmount));
        setPaySourceType(item.paymentSourceType || 'none');
        setPaySourceId(item.paymentSourceId || '');
        setIsPayOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !amount) return;

        const payload = {
            title,
            type,
            amount: Number(amount),
            paidAmount: Number(paidAmount),
            dueDate: new Date(dueDate),
            paymentSourceType,
            paymentSourceId: paymentSourceType !== 'none' ? paymentSourceId : undefined,
            chequeNumber: type === 'piti_cheque' ? chequeNumber : undefined,
            notes,
        };

        if (editingItem) {
            updateItem.mutate(
                { id: editingItem._id, data: payload },
                {
                    onSuccess: () => {
                        setIsFormOpen(false);
                        setEditingItem(null);
                        queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
                    },
                }
            );
        } else {
            createItem.mutate(payload, {
                onSuccess: () => {
                    setIsFormOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
                },
            });
        }
    };

    const handleConfirmDelete = () => {
        if (!deletingItem) return;
        deleteItem.mutate(deletingItem._id, {
            onSuccess: () => {
                setDeletingItem(null);
                queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            },
        });
    };

    const handleRecordPayment = (e) => {
        e.preventDefault();
        if (!payingItem || !payAmountInput) return;

        const additionalPay = Number(payAmountInput);
        const finalPaid = payingItem.paidAmount + additionalPay;

        const payload = {
            paidAmount: finalPaid,
            paymentSourceType: paySourceType,
            paymentSourceId: paySourceType !== 'none' ? paySourceId : undefined,
            status: finalPaid >= payingItem.amount ? 'completed' : 'pending',
        };

        updateItem.mutate(
            { id: payingItem._id, data: payload },
            {
                onSuccess: () => {
                    setIsPayOpen(false);
                    setPayingItem(null);
                    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
                },
            }
        );
    };

    const handleAutoAllocate = () => {
        const amt = Number(autoAllocAmount);
        if (!amt || amt <= 0) {
            toast.error('Please enter a valid amount to allocate.');
            return;
        }

        autoAllocate.mutate(amt, {
            onSuccess: (res) => {
                toast.success(`Successfully allocated ${formatCurrency(res.allocatedAmount)} to pay off ${res.updatedCount} items!`);
                setAutoAllocAmount('');
                queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            },
        });
    };

    const typeIcons = {
        piti_cheque: <Coins className="text-yellow-600 w-5 h-5" />,
        vehicle_fuel: <Fuel className="text-red-500 w-5 h-5" />,
        vehicle_finance: <Landmark className="text-indigo-600 w-5 h-5" />,
        vehicle_insurance: <ShieldCheck className="text-green-600 w-5 h-5" />,
        vehicle_license: <FileCheck className="text-teal-600 w-5 h-5" />,
        utility_bill: <Building2 className="text-blue-500 w-5 h-5" />,
        other: <CreditCard className="text-gray-500 w-5 h-5" />,
    };

    const typeLabels = {
        piti_cheque: 'Flour Cheque',
        vehicle_fuel: 'Fuel Expense',
        vehicle_finance: 'Vehicle Lease/Finance',
        vehicle_insurance: 'Insurance Expiry',
        vehicle_license: 'License Expiry',
        utility_bill: 'Utility Bill',
        other: 'Other Obligation',
    };

    const columns = [
        {
            key: 'type',
            label: 'Type',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-gray-50 rounded-lg border border-gray-100">{typeIcons[row.type] || typeIcons.other}</span>
                    <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">{typeLabels[row.type] || row.type}</span>
                </div>
            ),
        },
        {
            key: 'title',
            label: 'Description',
            render: (row) => (
                <div>
                    <div className="font-bold text-gray-900 text-sm">{row.title}</div>
                    {row.chequeNumber && (
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">Cheque No: {row.chequeNumber}</div>
                    )}
                    {row.notes && (
                        <div className="text-xs text-gray-400 italic max-w-xs truncate">{row.notes}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'dueDate',
            label: 'Due Date / Expiry',
            render: (row) => {
                const due = new Date(row.dueDate);
                const isOverdue = due < new Date() && row.status === 'pending';
                return (
                    <div className="flex items-center gap-1.5">
                        <Calendar size={13} className={isOverdue ? 'text-red-500' : 'text-gray-400'} />
                        <span className={`font-semibold text-xs ${isOverdue ? 'text-red-600 font-bold animate-pulse' : 'text-gray-600'}`}>
                            {due.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' })}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'amount',
            label: 'Total Amount',
            render: (row) => <span className="font-bold text-gray-900">{formatCurrency(row.amount)}</span>,
        },
        {
            key: 'paidAmount',
            label: 'Paid Amount',
            render: (row) => <span className="font-semibold text-green-600">{formatCurrency(row.paidAmount)}</span>,
        },
        {
            key: 'balance',
            label: 'Balance Due',
            render: (row) => {
                const bal = row.amount - row.paidAmount;
                return (
                    <span className={`font-bold ${bal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {formatCurrency(bal)}
                    </span>
                );
            },
        },
        {
            key: 'paymentSource',
            label: 'Source Account',
            render: (row) => {
                if (row.paymentSourceType === 'bank_account') {
                    const bank = bankAccounts.find(b => b._id === row.paymentSourceId);
                    return (
                        <div className="flex items-center gap-1 text-indigo-750 font-semibold text-xs bg-indigo-50 border border-indigo-150 rounded px-1.5 py-0.5 inline-flex">
                            <Landmark size={11} />
                            <span>{bank?.accountName || 'Bank Account'}</span>
                        </div>
                    );
                } else if (row.paymentSourceType === 'shop_collection') {
                    const shop = shops.find(s => s._id === row.paymentSourceId);
                    return (
                        <div className="flex items-center gap-1 text-emerald-750 font-semibold text-xs bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.5 inline-flex">
                            <Coins size={11} />
                            <span>{shop?.name || 'Shop Collection'}</span>
                        </div>
                    );
                } else if (row.paymentSourceType === 'cash_drawer') {
                    return (
                        <div className="flex items-center gap-1 text-amber-750 font-semibold text-xs bg-amber-50 border border-amber-150 rounded px-1.5 py-0.5 inline-flex">
                            <Wallet size={11} />
                            <span>Cash Register</span>
                        </div>
                    );
                }
                return <span className="text-gray-400 text-xs">—</span>;
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <Badge variant={row.status === 'completed' ? 'success' : 'warning'} className="text-[10px] font-bold tracking-wider uppercase">
                    {row.status === 'completed' ? 'Paid' : 'Pending'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (row) => (
                <div className="flex justify-end gap-1.5">
                    {row.status === 'pending' && (
                        <button
                            onClick={() => handleOpenPay(row)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded border border-green-150 transition"
                            title="Pay / Complete Obligation"
                        >
                            <CheckCircle2 size={15} />
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-gray-400 hover:text-indigo-650 hover:bg-indigo-50 rounded border border-gray-150 transition"
                        title="Edit Details"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={() => setDeletingItem(row)}
                        className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded border border-red-150 transition"
                        title="Delete Obligation"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Finance Planner & Leases"
                description="Manage vehicle leasing, insurance exipry, fuel expenses, flour cheques, and utility bills."
                actions={
                    <Button onClick={handleOpenCreate} className="flex items-center gap-2">
                        <Plus size={18} />
                        Add Finance Obligation
                    </Button>
                }
            />

            {/* Expiring Alerts Banner */}
            {alertItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3.5 items-start shadow-sm animate-in fade-in duration-300">
                    <AlertTriangle className="text-red-600 shrink-0 w-5 h-5 mt-0.5" />
                    <div>
                        <h4 className="font-extrabold text-red-950 text-sm uppercase tracking-wide">Upcoming Obligations & Expirations (Due in 2 days)</h4>
                        <p className="text-xs text-red-750 font-medium mt-1">
                            The following obligations are due or expiring in 2 days. SMS notifications will be triggered 2 days prior to the due date.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {alertItems.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-red-600 border border-red-150 shadow-sm">
                                    <span className="font-extrabold">{typeLabels[item.type] || item.type}:</span>
                                    <span>{item.title}</span>
                                    <span className="bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-extrabold">({formatCurrency(item.amount - item.paidAmount)} due)</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* KPIs Row */}
            <div className="grid grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-white border-indigo-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Daily Income</p>
                        <h3 className="text-2xl font-black text-indigo-750 mt-1">{formatCurrency(avgDailyIncome)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Calculated over last 30 days</p>
                    </div>
                    <span className="p-3 bg-indigo-100/50 rounded-2xl border border-indigo-200"><TrendingUp className="text-indigo-600" size={24} /></span>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-red-50 to-white border-red-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Obligations</p>
                        <h3 className="text-2xl font-black text-red-600 mt-1">{formatCurrency(totalLiabilities)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Sum of all outstanding bills</p>
                    </div>
                    <span className="p-3 bg-red-100/50 rounded-2xl border border-red-200"><Coins className="text-red-600" size={24} /></span>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-yellow-50 to-white border-yellow-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Flour Cheques</p>
                        <h3 className="text-2xl font-black text-yellow-600 mt-1">{formatCurrency(pendingCheques)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Cheques pending clearing</p>
                    </div>
                    <span className="p-3 bg-yellow-100/50 rounded-2xl border border-yellow-200"><Landmark className="text-yellow-600" size={24} /></span>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-teal-50 to-white border-teal-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Vehicle Leases</p>
                        <h3 className="text-2xl font-black text-teal-650 mt-1">{formatCurrency(pendingFinance)}</h3>
                        <p className="text-[10px] text-gray-400 font-medium mt-1">Vehicles finance installments</p>
                    </div>
                    <span className="p-3 bg-teal-100/50 rounded-2xl border border-teal-200"><Fuel className="text-teal-600" size={24} /></span>
                </Card>
            </div>

            {/* Auto-Allocation Panel */}
            <div className="p-6 bg-slate-900 bg-gradient-to-r from-slate-950 to-indigo-950 text-white rounded-2xl border border-slate-800 flex justify-between items-center shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12"><Sparkles size={250} /></div>
                <div className="space-y-1 z-10">
                    <h3 className="text-lg font-black tracking-wide flex items-center gap-2 uppercase text-white">
                        <Sparkles className="text-indigo-400" size={18} />
                        Auto-Allocate Daily Income
                    </h3>
                    <p className="text-xs text-indigo-250 font-medium max-w-lg">
                        Today&apos;s collected daily shop payments total <span className="font-bold text-white">{formatCurrency(todayIncome)}</span>. 
                        Enter an amount below to automatically distribute income and clear pending obligations (leases and cheques) by oldest due date first.
                    </p>
                </div>
                <div className="flex gap-2.5 items-center z-10">
                    <input
                        type="number"
                        placeholder="LKR Amount"
                        value={autoAllocAmount}
                        onChange={(e) => setAutoAllocAmount(e.target.value)}
                        className="border rounded-xl px-4 py-2.5 text-sm font-bold placeholder-gray-400 focus:outline-none w-40"
                        style={{ backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#334155' }}
                    />
                    <button
                        onClick={() => setAutoAllocAmount(String(todayIncome))}
                        className="text-xs text-indigo-300 hover:text-white font-bold bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl border border-white/10 transition-colors"
                        title="Use Today's Collected Shop Payments"
                    >
                        Use Today&apos;s
                    </button>
                    <button
                        type="button"
                        onClick={handleAutoAllocate}
                        disabled={autoAllocate.isPending}
                        className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all shadow-md cursor-pointer hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#ffffff', color: '#1e1b4b', border: 'none' }}
                    >
                        {autoAllocate.isPending && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        )}
                        <span>Allocate</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Obligations List Table */}
            <Card className="p-6">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : financeItems.length === 0 ? (
                    <EmptyState
                        title="No Obligations Recorded"
                        description="Start recording leases, flour cheques, and utility bills to manage your finance planner."
                    />
                ) : (
                    <Table columns={columns} data={financeItems} />
                )}
            </Card>

            {/* Finance Item Form Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingItem ? 'Edit Obligation Details' : 'Add Finance Obligation'}
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Title / Description"
                            placeholder="e.g. Hilux Lease Payment, Serendib Cheque"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <Select
                            label="Obligation Type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            options={[
                                { value: 'piti_cheque', label: 'Flour (Piti) Cheque' },
                                { value: 'vehicle_fuel', label: 'Vehicle Fuel' },
                                { value: 'vehicle_finance', label: 'Vehicle Lease/Finance' },
                                { value: 'vehicle_insurance', label: 'Vehicle Insurance Expiry' },
                                { value: 'vehicle_license', label: 'Vehicle License Expiry' },
                                { value: 'utility_bill', label: 'Utility Bill (Electricity/Water)' },
                                { value: 'other', label: 'Other Obligation' },
                            ]}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            label="Total Amount (LKR)"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                        <Input
                            label="Paid Amount (LKR)"
                            type="number"
                            placeholder="0.00"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            required
                        />
                        <Input
                            label="Due / Expiry Date"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            required
                        />
                    </div>

                    {type === 'piti_cheque' && (
                        <Input
                            label="Cheque Number"
                            placeholder="e.g. CHQ884920"
                            value={chequeNumber}
                            onChange={(e) => setChequeNumber(e.target.value)}
                            required
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <Select
                            label="Payment Source Type"
                            value={paymentSourceType}
                            onChange={(e) => {
                                setPaymentSourceType(e.target.value);
                                setPaymentSourceId('');
                            }}
                            options={[
                                { value: 'none', label: 'None (Pending)' },
                                { value: 'bank_account', label: 'Bank Account' },
                                { value: 'shop_collection', label: 'Shop daily collection' },
                                { value: 'cash_drawer', label: 'Cash Drawer / Register' },
                            ]}
                        />

                        {paymentSourceType === 'bank_account' && (
                            <Select
                                label="Select Bank Account"
                                value={paymentSourceId}
                                onChange={(e) => setPaymentSourceId(e.target.value)}
                                required
                                options={bankAccounts.map(b => ({
                                    value: b._id,
                                    label: `${b.accountName} (${b.bankName}) - Balance: LKR ${b.currentBalance?.toLocaleString()}`
                                }))}
                            />
                        )}

                        {paymentSourceType === 'shop_collection' && (
                            <Select
                                label="Select Bakery Shop"
                                value={paymentSourceId}
                                onChange={(e) => setPaymentSourceId(e.target.value)}
                                required
                                options={shops.map(s => ({
                                    value: s._id,
                                    label: `${s.name} - Outstanding Balance: LKR ${s.balance?.toLocaleString()}`
                                }))}
                            />
                        )}
                    </div>

                    <Textarea
                        label="Notes / Remarks"
                        placeholder="Additional details..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={createItem.isPending || updateItem.isPending}>
                            Save Obligation
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Pay Modal */}
            <Modal
                isOpen={isPayOpen}
                onClose={() => setIsPayOpen(false)}
                title="Record Payment / Complete Obligation"
            >
                <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                    <div className="bg-gray-50 border rounded-xl p-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Paying For</div>
                        <div className="font-bold text-gray-900 text-sm mt-1">{payingItem?.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Remaining Amount: <span className="font-bold text-red-600">{formatCurrency((payingItem?.amount || 0) - (payingItem?.paidAmount || 0))}</span></div>
                    </div>

                    <Input
                        label="Additional Payment Amount (LKR)"
                        type="number"
                        placeholder="0.00"
                        value={payAmountInput}
                        onChange={(e) => setPayAmountInput(e.target.value)}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Payment Source Type"
                            value={paySourceType}
                            onChange={(e) => {
                                setPaySourceType(e.target.value);
                                setPaySourceId('');
                            }}
                            options={[
                                { value: 'none', label: 'None (Pending)' },
                                { value: 'bank_account', label: 'Bank Account' },
                                { value: 'shop_collection', label: 'Shop daily collection' },
                                { value: 'cash_drawer', label: 'Cash Drawer / Register' },
                            ]}
                        />

                        {paySourceType === 'bank_account' && (
                            <Select
                                label="Select Bank Account"
                                value={paySourceId}
                                onChange={(e) => setPaySourceId(e.target.value)}
                                required
                                options={bankAccounts.map(b => ({
                                    value: b._id,
                                    label: `${b.accountName} (${b.bankName}) - Balance: LKR ${b.currentBalance?.toLocaleString()}`
                                }))}
                            />
                        )}

                        {paySourceType === 'shop_collection' && (
                            <Select
                                label="Select Bakery Shop"
                                value={paySourceId}
                                onChange={(e) => setPaySourceId(e.target.value)}
                                required
                                options={shops.map(s => ({
                                    value: s._id,
                                    label: `${s.name} - Outstanding Balance: LKR ${s.balance?.toLocaleString()}`
                                }))}
                            />
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsPayOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={updateItem.isPending}>
                            Record Payment
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Obligation"
                message={`Are you sure you want to delete obligation "${deletingItem?.title}"? This will permanently remove the record and revert any linked bank account transaction adjustments.`}
                confirmText="Delete"
                loading={deleteItem.isPending}
            />
        </div>
    );
}
