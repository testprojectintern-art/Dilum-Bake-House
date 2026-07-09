import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Loader2, Calendar, Eye, FileText, ArrowRight, Truck, RotateCcw, Landmark, Building2, Wallet, FileCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { useNuwaraEliyaDeliveries, useDeleteNuwaraEliyaDelivery } from '../features/bakery/useBakery';
import toast from 'react-hot-toast';

export default function NuwaraEliyaDeliveriesPage() {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Queries & Mutations
    const { data: deliveriesRes, isLoading } = useNuwaraEliyaDeliveries({ startDate, endDate });
    const deleteDelivery = useDeleteNuwaraEliyaDelivery();

    const deliveries = deliveriesRes?.data || [];

    // Calculate aggregate totals from the deliveries list
    const totalLoaded = deliveries.reduce((sum, d) => sum + (d.loadCost || 0), 0);
    const totalReturns = deliveries.reduce((sum, d) => sum + (d.returnsCost || 0), 0);
    const totalDeposits = deliveries.reduce((sum, d) => sum + (d.bankDeposits || 0), 0);
    const totalShopsOutstanding = deliveries.reduce((sum, d) => sum + (d.shopsOutstanding || 0), 0);
    const currentOutstanding = deliveries.length > 0 ? deliveries[0].nextOutstanding : 0;

    const handleDeleteConfirm = () => {
        if (!deletingId) return;
        deleteDelivery.mutate(deletingId, {
            onSuccess: () => {
                setDeletingId(null);
            }
        });
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const columns = [
        {
            key: 'billNumber',
            label: 'Bill Number',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-indigo-600" />
                    </div>
                    <span className="font-bold text-gray-800">{row.billNumber}</span>
                </div>
            )
        },
        {
            key: 'date',
            label: 'Trip Date',
            render: (row) => new Date(row.date).toLocaleDateString('en-LK', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    row.status === 'settled' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                        : 'bg-amber-50 text-amber-700 border-amber-150'
                }`}>
                    {row.status === 'settled' ? 'Settled' : 'Loaded'}
                </span>
            )
        },
        {
            key: 'loadCost',
            label: 'Loaded Cost',
            render: (row) => <span className="font-semibold text-gray-700">{formatPrice(row.loadCost)}</span>
        },
        {
            key: 'deductions',
            label: 'Total Deductions',
            render: (row) => {
                const totalDeductions = (row.bankDeposits || 0) + (row.returnsCost || 0) + (row.onBoardStockCost || 0) + (row.shopsOutstanding || 0);
                return <span className="text-gray-500 font-medium">{formatPrice(totalDeductions)}</span>;
            }
        },
        {
            key: 'netOutstanding',
            label: 'Net Outstanding',
            render: (row) => <span className="font-bold text-slate-800">{formatPrice(row.netOutstanding)}</span>
        },
        {
            key: 'nextOutstanding',
            label: 'Remaining Carryover',
            render: (row) => (
                <span className={`font-bold ${row.nextOutstanding > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {formatPrice(row.nextOutstanding)}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '130px',
            render: (row) => (
                <div className="flex gap-1 justify-end">
                    <button
                        onClick={() => navigate(`/bakery/nuwara-eliya/${row._id}`)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="View details"
                    >
                        <Eye size={16} />
                    </button>
                    {row.status !== 'settled' && (
                        <button
                            onClick={() => navigate(`/bakery/nuwara-eliya/${row._id}/settle`)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                            title="Settle Trip"
                        >
                            <FileCheck size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (row.status === 'settled') {
                                navigate(`/bakery/nuwara-eliya/${row._id}/edit-settlement`);
                            } else {
                                navigate(`/bakery/nuwara-eliya/${row._id}/edit-load`);
                            }
                        }}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                        title="Edit trip bill"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => setDeletingId(row._id)}
                        className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition"
                        title="Delete bill"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Nuwara Eliya Delivery"
                description="Manage consignment logs, loads, returns, on-board inventory, bank deposits, and trip settlements."
                actions={
                    <Button onClick={() => navigate('/bakery/nuwara-eliya/load-trip')} className="flex items-center gap-2">
                        <Plus size={18} />
                        New Trip Load
                    </Button>
                }
            />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Loaded Value</p>
                        <h3 className="text-base font-bold text-gray-900">{formatPrice(totalLoaded)}</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-indigo-600" />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Returns</p>
                        <h3 className="text-base font-bold text-red-655">{formatPrice(totalReturns)}</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <RotateCcw className="w-5 h-5 text-red-600" />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Deposits</p>
                        <h3 className="text-base font-bold text-green-700">{formatPrice(totalDeposits)}</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <Landmark className="w-5 h-5 text-green-600" />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Shops Outstanding</p>
                        <h3 className="text-base font-bold text-amber-750">{formatPrice(totalShopsOutstanding)}</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-indigo-600 border-none hover:shadow-lg shadow-indigo-100/50 transition text-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Current Running Balance</p>
                        <h3 className="text-base font-extrabold">{formatPrice(currentOutstanding)}</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                </Card>
            </div>

            {/* Filters panel */}
            <Card className="p-4 flex flex-wrap items-end gap-4 bg-white/70 backdrop-blur-md border-gray-100">
                <div className="w-full sm:w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-3 pr-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="w-full sm:w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-3 pr-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
                        />
                    </div>
                </div>

                {(startDate || endDate) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="py-1.5"
                    >
                        Clear Filters
                    </Button>
                )}
            </Card>

            {/* List Table */}
            <Card className="p-6">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-indigo-600" size={36} />
                    </div>
                ) : deliveries.length === 0 ? (
                    <EmptyState
                        title="No Trips Registered"
                        description="Start creating Nuwara Eliya delivery consignment logs to manage outstanding balances."
                    />
                ) : (
                    <Table columns={columns} data={deliveries} />
                )}
            </Card>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Consignment Record"
                message="Are you sure you want to delete this Nuwara Eliya delivery trip record? This action cannot be undone."
                confirmText="Delete"
                loading={deleteDelivery.isPending}
            />
        </div>
    );
}
