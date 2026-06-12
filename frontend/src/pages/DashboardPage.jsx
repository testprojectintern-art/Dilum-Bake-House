import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, ShoppingCart, TrendingUp, AlertTriangle,
    Package, Factory, FileText, Users, CreditCard, ArrowRight,
    User, Briefcase, Clock, Plane, CalendarCheck, Wallet,
    ChevronDown, CheckCircle, XCircle, BadgeCheck, Building2,
    LayoutDashboard, UserCircle,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import KpiCard from '../components/ui/KpiCard';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { Calendar } from 'lucide-react';
import {
    useDashboardKpis, useRevenueChart, useTopProducts, useTopCustomers,
} from '../features/reports/useReports';
import { useEmployeeMe, useMyPayslips, useLeaves, useAttendance } from '../features/hr/useHr';

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

const statusColors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'default',
    paid: 'success',
    processing: 'info',
    on_hold: 'warning',
};

// ─── Business Overview (Admin / Manager / Accountant) ───────────────────────
function BusinessOverview() {
    const navigate = useNavigate();
    const { data: kpisData, isLoading } = useDashboardKpis();
    const { data: revenueData } = useRevenueChart(6);
    const { data: topProductsData } = useTopProducts({ period: 'month', limit: 5 });
    const { data: topCustomersData } = useTopCustomers({ period: 'month', limit: 5 });

    const k = kpisData?.data;

    if (isLoading || !k) return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading dashboard…</p>
            </div>
        </div>
    );

    return (
        <div>
            {/* Primary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <KpiCard label="Revenue" value={fmtShort(k.revenue?.thisMonth)}
                    icon={TrendingUp} iconColor="text-indigo-600" iconBg="bg-indigo-50"
                    trend={k.revenue?.growth} accentColor="bg-indigo-500" subtext="This Month" />
                <KpiCard label="Gross Profit"
                    value={`${fmtShort(k.grossProfit?.thisMonth)} (${k.revenue?.thisMonth > 0 ? ((k.grossProfit?.thisMonth / k.revenue?.thisMonth) * 100).toFixed(1) : '0.0'}%)`}
                    icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50"
                    trend={k.grossProfit?.growth} accentColor="bg-emerald-500" subtext="Gross Margin Percentage" />
                <KpiCard label="Net Cash Flow"
                    value={`${fmtShort(k.cashFlow?.thisMonth)} (${k.revenue?.thisMonth > 0 ? ((k.cashFlow?.thisMonth / k.revenue?.thisMonth) * 100).toFixed(1) : '0.0'}%)`}
                    icon={CreditCard} iconColor="text-blue-600" iconBg="bg-blue-50"
                    trend={k.cashFlow?.growth} accentColor="bg-blue-500" subtext="% of Total Revenue" />
                <KpiCard label="Orders Today" value={k.orders?.today}
                    icon={ShoppingCart} iconColor="text-purple-600" iconBg="bg-purple-50"
                    accentColor="bg-purple-500" onClick={() => navigate('/sales-orders')} />
                <KpiCard label="Receivables" value={fmtShort(k.receivables?.total)}
                    icon={ArrowRight} iconColor="text-amber-600" iconBg="bg-amber-50"
                    accentColor="bg-amber-500" onClick={() => navigate('/invoices')} />
                <KpiCard label="Low Stock" value={k.stock?.lowStockCount}
                    icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-50"
                    accentColor="bg-red-500" onClick={() => navigate('/reports/inventory/low-stock')} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Pending Approvals" value={k.orders?.pendingApproval}
                    icon={FileText} iconColor="text-indigo-600" iconBg="bg-indigo-50" accentColor="bg-indigo-500" />
                <KpiCard label="Pending Dispatch" value={k.orders?.pendingDispatch}
                    icon={Package} iconColor="text-purple-600" iconBg="bg-purple-50" accentColor="bg-purple-500" />
                <KpiCard label="Active Production" value={k.production?.active}
                    icon={Factory} iconColor="text-pink-600" iconBg="bg-pink-50" accentColor="bg-pink-500"
                    subtext={`${k.production?.completedThisMonth} completed this month`} />
                <KpiCard label="Active Customers" value={k.customers?.total}
                    icon={Users} iconColor="text-cyan-600" iconBg="bg-cyan-50" accentColor="bg-cyan-400"
                    subtext={`${k.customers?.newThisMonth} new this month`} />
            </div>

            {/* Revenue Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="lg:col-span-2 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend (Last 6 Months)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={Array.isArray(revenueData?.data) ? revenueData.data : []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2}
                                dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                        <Button fullWidth variant="outline" onClick={() => navigate('/sales-orders/new')}>
                            New Sales Order <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/payments/new')}>
                            Record Payment <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/purchase-orders/new')}>
                            New Purchase Order <ArrowRight size={14} className="ml-auto" />
                        </Button>
                        <Button fullWidth variant="outline" onClick={() => navigate('/reports')}>
                            View All Reports <ArrowRight size={14} className="ml-auto" />
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Top Products & Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Top Products This Month</h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/reports/sales')}>View All</Button>
                    </div>
                    {(!topProductsData?.data || topProductsData.data.length === 0) ? (
                        <p className="text-center text-gray-500 py-8 text-sm">No sales this month yet</p>
                    ) : (
                        <div className="space-y-2">
                            {topProductsData.data.map((p, idx) => (
                                <div key={p._id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-primary-50 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-medium">{p.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{p.productCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{fmt(p.revenue)}</p>
                                        <p className="text-xs text-gray-500">{p.quantitySold} units</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-semibold text-gray-700">Top Customers This Month</h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>View All</Button>
                    </div>
                    {(!topCustomersData?.data || topCustomersData.data.length === 0) ? (
                        <p className="text-center text-gray-500 py-8 text-sm">No invoices this month yet</p>
                    ) : (
                        <div className="space-y-2">
                            {topCustomersData.data.map((c, idx) => (
                                <div key={c._id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
                                        <div>
                                            <p className="text-sm font-medium">{c.customerName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{c.customerCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{fmt(c.totalInvoiced)}</p>
                                        <p className="text-xs text-gray-500">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Low Stock Alerts */}
            {k.stock?.lowStockItems?.length > 0 && (
                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={18} /> Low Stock Alerts
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock')}>View Stock</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {k.stock.lowStockItems.slice(0, 10).map((item) => (
                            <div key={item.productId} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
                                <div>
                                    <p className="text-sm font-medium">{item.productName}</p>
                                    <p className="text-xs text-gray-600 font-mono">{item.productCode}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="danger">{item.available} left</Badge>
                                    <p className="text-xs text-gray-600 mt-1">Reorder at: {item.reorderLevel}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

// ─── Personal / Employee Dashboard ──────────────────────────────────────────
function PersonalDashboard({ user }) {
    const navigate = useNavigate();
    const { data: empData, isLoading: empLoading } = useEmployeeMe();
    const { data: payslipsData, isLoading: payLoading } = useMyPayslips();
    const { data: leavesData } = useLeaves({ limit: 5 });
    const { data: attendanceData } = useAttendance({ limit: 7 });

    const emp = empData?.data;
    const payslips = payslipsData?.data || [];
    const leaves = leavesData?.data || [];
    const attendance = attendanceData?.data || [];

    if (empLoading || payLoading) return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Loading your dashboard…</p>
            </div>
        </div>
    );

    if (!emp) return (
        <Card className="p-10 text-center">
            <UserCircle size={56} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No Employee Profile Found</h3>
            <p className="text-sm text-gray-500">Your user account is not yet linked to an employee profile. Please contact admin or HR.</p>
        </Card>
    );

    const latestPayslip = payslips[0] || null;
    const leaveBalances = emp.leaveBalances || {};
    const totalLeaveBalance = Object.values(leaveBalances).reduce((s, v) => s + (v || 0), 0);

    return (
        <div className="space-y-6">
            {/* Employee Profile Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-6 text-white shadow-lg">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute -right-4 bottom-0 w-32 h-32 bg-white/5 rounded-full" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold flex-shrink-0">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold">{emp.firstName} {emp.lastName}</h2>
                        <p className="text-violet-200 text-sm">{emp.designationId?.name || user?.role}</p>
                        <div className="flex flex-wrap gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1">
                                <Briefcase size={12} /> {emp.departmentId?.name || 'No Department'}
                            </span>
                            <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1">
                                <BadgeCheck size={12} /> {emp.employeeCode}
                            </span>
                            <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1">
                                <Building2 size={12} /> {emp.employmentType || 'Full Time'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-violet-200 text-xs">Basic Salary</p>
                        <p className="text-2xl font-bold">{fmt(emp.basicSalary)}</p>
                        <p className="text-violet-200 text-xs mt-0.5">per month</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Latest Net Pay */}
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <Wallet size={16} className="text-green-600" />
                        </div>
                        <span className="text-xs text-gray-500">Last Net Pay</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {latestPayslip ? fmt(latestPayslip.netPay) : '—'}
                    </p>
                    {latestPayslip && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            {MONTH_NAMES[latestPayslip.periodMonth - 1]} {latestPayslip.periodYear}
                        </p>
                    )}
                    {!latestPayslip && <p className="text-xs text-gray-400 mt-0.5">No payslip yet</p>}
                </Card>

                {/* Leave Balance */}
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Plane size={16} className="text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-500">Leave Balance</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{totalLeaveBalance} days</p>
                    <p className="text-xs text-gray-400 mt-0.5">Annual + Other</p>
                </Card>

                {/* Attendance this month */}
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <CalendarCheck size={16} className="text-purple-600" />
                        </div>
                        <span className="text-xs text-gray-500">Days Present</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {attendance.filter(a => a.status === 'present').length}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Recent records</p>
                </Card>

                {/* Pending Leaves */}
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Clock size={16} className="text-amber-600" />
                        </div>
                        <span className="text-xs text-gray-500">Pending Leaves</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {leaves.filter(l => l.status === 'pending').length}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Awaiting approval</p>
                </Card>
            </div>

            {/* Payslips + Leaves Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Recent Payslips */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600" /> My Payslips
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/payroll/' + (latestPayslip?.payrollId) + '/payslip/' + emp._id)}
                            disabled={!latestPayslip}>
                            View Latest
                        </Button>
                    </div>
                    {payslips.length === 0 ? (
                        <div className="text-center py-8">
                            <Wallet size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No payslips available yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {payslips.slice(0, 6).map((ps) => (
                                <div key={ps.payrollId}
                                    className="flex items-center justify-between py-3 px-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer group"
                                    onClick={() => navigate(`/payroll/${ps.payrollId}/payslip/${emp._id}`)}>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700">
                                            {MONTH_NAMES[ps.periodMonth - 1]} {ps.periodYear}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono">{ps.payrollNumber}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">{fmt(ps.netPay)}</p>
                                            <p className="text-xs text-gray-400">Gross: {fmt(ps.grossEarnings)}</p>
                                        </div>
                                        <Badge variant={statusColors[ps.paymentStatus] || 'default'}>
                                            {ps.paymentStatus}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* My Leave Applications */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Plane size={16} className="text-blue-600" /> My Leave Requests
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => navigate('/leaves')}>
                            All Leaves
                        </Button>
                    </div>
                    {leaves.length === 0 ? (
                        <div className="text-center py-8">
                            <Plane size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No leave requests found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {leaves.slice(0, 6).map((leave) => (
                                <div key={leave._id}
                                    className="flex items-start justify-between py-3 px-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 capitalize">{leave.leaveType} Leave</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(leave.fromDate).toLocaleDateString('en-LK')} → {new Date(leave.toDate).toLocaleDateString('en-LK')}
                                        </p>
                                        <p className="text-xs text-gray-400">{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</p>
                                    </div>
                                    <Badge variant={statusColors[leave.status] || 'default'}>
                                        {leave.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leave Balance Summary */}
                    {Object.keys(leaveBalances).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Leave Balances</p>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(leaveBalances).filter(([, v]) => v > 0).map(([type, bal]) => (
                                    <div key={type} className="text-center bg-gray-50 rounded-lg py-2 px-1">
                                        <p className="text-xs font-semibold text-gray-700 capitalize">{type}</p>
                                        <p className="text-sm font-bold text-indigo-600">{bal}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Attendance Log */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <CalendarCheck size={16} className="text-purple-600" /> Recent Attendance
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                        Full Log
                    </Button>
                </div>
                {attendance.length === 0 ? (
                    <div className="text-center py-8">
                        <CalendarCheck size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No attendance records yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {attendance.map((att) => {
                            const d = new Date(att.date);
                            const isPresent = att.status === 'present';
                            const isAbsent = att.status === 'absent';
                            return (
                                <div key={att._id}
                                    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border transition-all ${
                                        isPresent ? 'bg-green-50 border-green-200' :
                                        isAbsent ? 'bg-red-50 border-red-200' :
                                        'bg-amber-50 border-amber-200'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isPresent ? 'bg-green-200 text-green-700' :
                                        isAbsent ? 'bg-red-200 text-red-700' :
                                        'bg-amber-200 text-amber-700'
                                    }`}>
                                        {isPresent ? <CheckCircle size={14} /> : isAbsent ? <XCircle size={14} /> : <Clock size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-800 truncate">
                                            {d.toLocaleDateString('en-LK', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{att.status}</p>
                                        {att.checkInTime && (
                                            <p className="text-xs text-gray-400">
                                                {new Date(att.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}
                                                {att.checkOutTime ? ` – ${new Date(att.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}

// ─── Main Dashboard Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuthStore();

    // 'overview' | 'personal'
    const isStaffOnly = ['employee', 'cashier'].includes(user?.role);
    const isPrivileged = ['admin', 'manager', 'accountant'].includes(user?.role);
    const hasBothViews = ['manager', 'accountant'].includes(user?.role);

    const [activeTab, setActiveTab] = useState(isStaffOnly ? 'personal' : 'overview');

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                        {getTimeGreeting()}, <span className="text-indigo-600">{user?.firstName}!</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isStaffOnly
                            ? 'Welcome back — here\'s your personal summary.'
                            : 'Here\'s what\'s happening with your store today.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-sm font-medium text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    {fmtDate(new Date())}
                </div>
            </div>

            {/* Tab Toggle (only for manager / accountant) */}
            {hasBothViews && (
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6 shadow-inner">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'overview'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <LayoutDashboard size={15} /> Store Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'personal'
                                ? 'bg-white text-violet-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <UserCircle size={15} /> My Dashboard
                    </button>
                </div>
            )}

            {/* Content */}
            {(activeTab === 'overview' && isPrivileged) && <BusinessOverview />}
            {activeTab === 'personal' && <PersonalDashboard user={user} />}
        </div>
    );
}