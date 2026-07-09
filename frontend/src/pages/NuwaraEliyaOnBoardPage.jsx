import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Calendar, FileText, ArrowUpRight, Archive } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import EmptyState from '../components/ui/EmptyState';
import { useNuwaraEliyaDeliveries } from '../features/bakery/useBakery';

export default function NuwaraEliyaOnBoardPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Query all deliveries
    const { data: deliveriesRes, isLoading } = useNuwaraEliyaDeliveries({ startDate, endDate });
    const deliveries = deliveriesRes?.data || [];

    // Flatten all on-board remaining items across all trips
    const onBoardLines = [];
    deliveries.forEach(d => {
        if (d.onBoardItems) {
            d.onBoardItems.forEach(item => {
                if (!search || item.productName.toLowerCase().includes(search.toLowerCase())) {
                    onBoardLines.push({
                        _id: d._id,
                        billNumber: d.billNumber,
                        date: d.date,
                        productName: item.productName,
                        price: item.price,
                        qty: item.qty,
                        subtotal: item.qty * item.price
                    });
                }
            });
        }
    });

    // KPI Aggregates
    const totalQty = onBoardLines.reduce((sum, line) => sum + line.qty, 0);
    const totalValue = onBoardLines.reduce((sum, line) => sum + line.subtotal, 0);

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
            label: 'Trip Bill No',
            render: (row) => (
                <button
                    onClick={() => navigate(`/bakery/nuwara-eliya/${row._id}`)}
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition text-left"
                >
                    <span>{row.billNumber}</span>
                    <ArrowUpRight size={12} />
                </button>
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
            key: 'productName',
            label: 'Product Name',
            render: (row) => <span className="font-semibold text-gray-800">{row.productName}</span>
        },
        {
            key: 'price',
            label: 'Price',
            render: (row) => <span className="text-gray-600">{formatPrice(row.price)}</span>
        },
        {
            key: 'qty',
            label: 'On-Board Qty',
            render: (row) => <span className="font-bold text-amber-700">{row.qty}</span>
        },
        {
            key: 'subtotal',
            label: 'On-Board Value',
            render: (row) => <span className="font-bold text-amber-700">{formatPrice(row.subtotal)}</span>
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="On-Board Stock (Remaining)"
                description="List of all products left in the vehicle or stored in Nuwara Eliya across different trips."
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total On-Board Quantity</p>
                        <h3 className="text-xl font-bold text-gray-900">{totalQty} Units</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Archive className="w-5 h-5 text-amber-600" />
                    </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-white border-gray-100 hover:shadow-md transition">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total On-Board Value</p>
                        <h3 className="text-xl font-bold text-amber-700">{formatPrice(totalValue)}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 flex flex-wrap items-end gap-4 bg-white/70 backdrop-blur-md border-gray-100">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search Product</label>
                    <div className="relative">
                        <Input
                            placeholder="Search by product name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                <div className="w-full sm:w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-3 pr-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
                    />
                </div>
                <div className="w-full sm:w-[180px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-3 pr-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
                    />
                </div>

                {(search || startDate || endDate) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }}
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
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : onBoardLines.length === 0 ? (
                    <EmptyState
                        title="No On-Board Items Found"
                        description="There are no remaining on-board products matching your filters."
                    />
                ) : (
                    <Table columns={columns} data={onBoardLines} />
                )}
            </Card>
        </div>
    );
}
