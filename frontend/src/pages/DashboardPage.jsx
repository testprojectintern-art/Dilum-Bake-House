import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, FileText, Users, CreditCard, ArrowRight,
    Clock, Calendar, CheckCircle, ArrowRightLeft,
    TrendingDown, ShieldAlert
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { useBakeryDashboard } from '../features/bakery/useBakery';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n) => {
    if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `LKR ${(n / 1000).toFixed(0)}k`;
    return fmt(n);
};

const fmtDate = (d) => new Intl.DateTimeFormat('en-LK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(d);

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // Default dates helper
    const getTodayString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const getFirstDayOfMonthString = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}-01`;
    };

    const [fromDate, setFromDate] = useState(getFirstDayOfMonthString());
    const [toDate, setToDate] = useState(getTodayString());

    const getStartOfDayISO = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    };

    const getEndOfDayISO = (dateStr) => {
        if (!dateStr) return undefined;
        const d = new Date(dateStr);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    };

    const startDate = getStartOfDayISO(fromDate);
    const endDate = getEndOfDayISO(toDate);

    const { data: dashboardRes, isLoading } = useBakeryDashboard({
        startDate,
        endDate
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm font-semibold">Loading Bakery Dashboard…</p>
                </div>
            </div>
        );
    }

    const dData = dashboardRes?.data || {};
    const kpis = dData.kpis || { monthlySales: 0, monthlyReceived: 0, totalOutstanding: 0, todaySales: 0, shopCount: 0, productCount: 0 };
    const trendData = dData.trendData || [];
    const topShops = dData.topShops || [];
    const recentInvoices = dData.recentInvoices || [];

    // Calculate diff in days
    const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                        {getTimeGreeting()}, <span className="text-indigo-600">{user?.firstName || 'Admin'}!</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Welcome to <span className="font-bold text-gray-800">Dilum Bake House</span> billing dashboard.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-sm font-semibold text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    {fmtDate(new Date())}
                </div>
            </div>

            {/* Date Filters Card */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Dashboard Reports Filter</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Filter all KPIs, charts, and shop sales by selecting a date range.</p>
                    </div>
                    <div className="flex gap-2.5 w-full md:w-auto justify-start">
                        <div className="flex-1 sm:w-44 sm:flex-initial">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="pl-2 sm:pl-9 py-1 text-xs"
                                />
                                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none hidden sm:block" />
                            </div>
                        </div>
                        <div className="flex-1 sm:w-44 sm:flex-initial">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="pl-2 sm:pl-9 py-1 text-xs"
                                />
                                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none hidden sm:block" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard
                    label="Today's Net Sales"
                    value={fmtShort(kpis.todaySales)}
                    icon={ShoppingCart}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                    accentColor="bg-indigo-500"
                />
                <KpiCard
                    label="Period Net Sales"
                    value={fmtShort(kpis.monthlySales)}
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50"
                    accentColor="bg-blue-500"
                    subtext="Filtered Range"
                />
                <KpiCard
                    label="Period Collections"
                    value={fmtShort(kpis.monthlyReceived)}
                    icon={DollarSign}
                    iconColor="text-green-600"
                    iconBg="bg-green-50"
                    accentColor="bg-green-500"
                    subtext="Cash Collected"
                />
                <KpiCard
                    label="Total Receivables"
                    value={fmtShort(kpis.totalOutstanding)}
                    icon={CreditCard}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                    accentColor="bg-amber-500"
                    subtext="All Shops Balances"
                />
                <KpiCard
                    label="Active Shops"
                    value={kpis.shopCount}
                    icon={Users}
                    iconColor="text-cyan-600"
                    iconBg="bg-cyan-50"
                    accentColor="bg-cyan-500"
                />
                <KpiCard
                    label="Active Products"
                    value={kpis.productCount}
                    icon={Package}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                    accentColor="bg-purple-500"
                />
            </div>

            {/* Charts & Top Shops Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <Card className="lg:col-span-2 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
                        {diffDays <= 31 ? 'Daily Sales Trend' : 'Monthly Sales Trend'}
                    </h3>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(v) => fmt(v)} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line name="Net Sales (LKR)" type="monotone" dataKey="sales" stroke="#1e3a8a" strokeWidth={2.5} dot={{ fill: '#1e3a8a', r: 4 }} activeDot={{ r: 6 }} />
                                <Line name="Deliveries" type="monotone" dataKey="deliveries" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                                <Line name="Returns" type="monotone" dataKey="returns" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Shops this Month */}
                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Top Shops (Filtered Period)</h3>
                    {topShops.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
                            <Users size={32} className="mb-2" />
                            <p className="text-xs">No sales data for this period</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topShops.map((shop, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate uppercase">{shop.shopName}</p>
                                        <p className="text-xs text-gray-400">Cash Collected: {fmt(shop.totalReceived)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-extrabold text-blue-700">{fmt(shop.totalSales)}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Net Sales</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Recent Invoices Table */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Recent Invoices (Filtered Period)</h3>
                    <Button variant="outline" size="sm" onClick={() => navigate('/bakery/invoices')}>
                        View All
                    </Button>
                </div>
                {recentInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <FileText size={32} className="mb-2" />
                        <p className="text-xs">No invoices generated in this period</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-6">
                        <div className="inline-block min-w-full align-middle px-6">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                        <th className="py-3">Invoice No</th>
                                        <th className="py-3">Shop</th>
                                        <th className="py-3">Date</th>
                                        <th className="py-3 text-right">Grand Total</th>
                                        <th className="py-3 text-right">Paid Today</th>
                                        <th className="py-3 text-right">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                                    {recentInvoices.map((inv) => (
                                        <tr key={inv._id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(inv.type === 'nuwara-eliya' ? `/bakery/nuwara-eliya/${inv._id}` : '/bakery/invoices')}>
                                            <td className="py-3.5 font-bold text-gray-900">{inv.invoiceNumber}</td>
                                            <td className="py-3.5 text-gray-800 uppercase">{inv.shopName}</td>
                                            <td className="py-3.5 text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                                            <td className="py-3.5 text-right font-bold text-gray-900">{fmt(inv.grandTotal)}</td>
                                            <td className="py-3.5 text-right font-bold text-green-600">-{fmt(inv.amountReceived)}</td>
                                            <td className={`py-3.5 text-right font-black ${inv.newBalance > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                                                {fmt(inv.newBalance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}