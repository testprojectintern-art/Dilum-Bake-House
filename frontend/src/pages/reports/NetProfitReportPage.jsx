import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, DollarSign, Wallet, Percent, PieChart as ChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { useNetProfitAnalysis } from '../../features/reports/useReports';
import { useProducts } from '../../features/products/useProducts';

const COLORS = ['#10b981', '#3b82f6', '#f43f5e']; // Emerald (Profit), Blue (Cost), Rose (Expenses)

export default function NetProfitReportPage() {
    const navigate = useNavigate();
    
    // Default to this month
    const today = new Date();
    const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        startDate: firstDayStr,
        endDate: lastDayStr,
        productId: '',
        groupBy: 'month'
    });

    const { data: profitRes, isLoading } = useNetProfitAnalysis(filters);
    const { data: productsRes } = useProducts({ limit: 1000, status: 'active' });

    const profitData = profitRes?.data || { summary: { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 }, breakdown: [] };
    const products = productsRes?.data || [];

    const productOptions = products.map(p => ({
        value: p._id,
        label: `${p.name} (${p.productCode})`
    }));

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    // Format data for Recharts Pie
    const chartData = useMemo(() => {
        const { summary } = profitData;
        
        if (filters.productId) {
            // Product Specific - Show Margin vs COGS (Expenses are general, so they don't apply to a single product)
            const margin = Math.max(0, summary.revenue - summary.cogs);
            return [
                { name: 'Product Net Margin', value: margin },
                { name: 'Cost of Goods Sold (COGS)', value: summary.cogs }
            ];
        }

        // Business Wide - Net Profit vs Cost vs Expenses
        const profitVal = Math.max(0, summary.netProfit);
        return [
            { name: 'Net Profit', value: profitVal },
            { name: 'Cost of Goods Sold (COGS)', value: summary.cogs },
            { name: 'Operating Expenses', value: summary.expenses }
        ];
    }, [profitData, filters.productId]);

    const handleQuickDate = (type) => {
        const now = new Date();
        if (type === 'this-month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            setFilters(f => ({ ...f, startDate: start, endDate: end }));
        } else if (type === 'last-month') {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            setFilters(f => ({ ...f, startDate: start, endDate: end }));
        } else if (type === 'this-year') {
            const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
            setFilters(f => ({ ...f, startDate: start, endDate: end }));
        }
    };

    const columns = [
        { key: 'label', label: 'Period / Date', render: (r) => <span className="font-semibold">{r.label}</span> },
        { key: 'revenue', label: 'Revenue', render: (r) => <span className="text-green-600 font-medium">{fmt(r.revenue)}</span> },
        { key: 'cost', label: 'Cost of Goods Sold (COGS)', render: (r) => <span className="text-blue-600 font-medium">{fmt(r.cost)}</span> },
        { 
            key: 'netProfit', 
            label: filters.productId ? 'Product Profit' : 'Gross profit (before expenses)', 
            render: (r) => {
                const profitVal = r.revenue - r.cost;
                return (
                    <span className={`font-bold ${profitVal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(profitVal)}
                    </span>
                );
            } 
        }
    ];

    const { summary } = profitData;
    const profitMarginPct = summary.revenue > 0 ? ((summary.netProfit / summary.revenue) * 100).toFixed(1) : '0.0';

    return (
        <div>
            <PageHeader
                title="Net Profit Analysis"
                description="Monitor true profitability by factoring in item costs and business expenses"
                actions={
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by Product</label>
                        <Select
                            placeholder="All Products (General business)"
                            options={productOptions}
                            value={filters.productId}
                            onChange={(e) => setFilters(f => ({ ...f, productId: e.target.value }))}
                        />
                    </div>
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
                    <div className="w-full sm:w-36">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Group By</label>
                        <Select
                            options={[
                                { value: 'month', label: 'Monthly' },
                                { value: 'year', label: 'Annually' }
                            ]}
                            value={filters.groupBy}
                            onChange={(e) => setFilters(f => ({ ...f, groupBy: e.target.value }))}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate('this-month')}>This Month</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate('last-month')}>Last Month</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate('this-year')}>This Year</Button>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-20 text-center text-gray-500">Loading analysis data...</div>
            ) : (
                <>
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="p-5 border-l-4 border-l-green-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase">Total Revenue</p>
                                    <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.revenue)}</h3>
                                </div>
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={18} /></div>
                            </div>
                        </Card>
                        
                        <Card className="p-5 border-l-4 border-l-blue-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase">Cost of Goods Sold (COGS)</p>
                                    <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.cogs)}</h3>
                                </div>
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={18} /></div>
                            </div>
                        </Card>

                        <Card className="p-5 border-l-4 border-l-rose-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase">Operating Expenses</p>
                                    <h3 className="text-xl font-bold text-gray-900 mt-1">
                                        {filters.productId ? '—' : fmt(summary.expenses)}
                                    </h3>
                                    {filters.productId && <p className="text-[10px] text-gray-400 mt-1">Not split by product</p>}
                                </div>
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Wallet size={18} /></div>
                            </div>
                        </Card>

                        <Card className="p-5 border-l-4 border-l-emerald-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase">
                                        {filters.productId ? 'Product Net Margin' : 'Net Profit'}
                                    </p>
                                    <h3 className={`text-xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {filters.productId ? fmt(summary.revenue - summary.cogs) : fmt(summary.netProfit)}
                                    </h3>
                                    {!filters.productId && (
                                        <p className="text-[10px] text-gray-500 mt-1 font-semibold flex items-center gap-0.5">
                                            <Percent size={10} /> {profitMarginPct}% Profit Margin
                                        </p>
                                    )}
                                </div>
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ChartIcon size={18} /></div>
                            </div>
                        </Card>
                    </div>

                    {/* Chart & Queue */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <Card className="lg:col-span-1 p-6 flex flex-col justify-between">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Allocation</h3>
                            
                            {chartData.every(item => item.value === 0) ? (
                                <div className="flex-1 flex items-center justify-center py-12 text-gray-400 text-sm">
                                    No transaction data available for this selection
                                </div>
                            ) : (
                                <>
                                    <div className="h-60 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => fmt(value)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 space-y-1 text-xs">
                                        {chartData.map((item, idx) => (
                                            <div key={item.name} className="flex justify-between items-center py-1 border-b last:border-0">
                                                <span className="flex items-center gap-1.5 font-medium text-gray-600">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                                                    {item.name}
                                                </span>
                                                <span className="font-bold text-gray-800">{fmt(item.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card>

                        <Card className="lg:col-span-2 p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
                            <Table columns={columns} data={profitData.breakdown} />
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
