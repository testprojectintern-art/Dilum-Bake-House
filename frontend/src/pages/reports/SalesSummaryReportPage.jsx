import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, LineChart, Line,
} from 'recharts';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useSalesSummary, useSalesTrend } from '../../features/reports/useReports';

export default function SalesSummaryReportPage() {
    const navigate = useNavigate();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);
    const [groupBy, setGroupBy] = useState('day');

    const { data: summaryData, isLoading } = useSalesSummary({ startDate, endDate });
    const { data: trendData } = useSalesTrend({ startDate, endDate, groupBy });

    const s = summaryData?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtShort = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n;

    const applyPreset = (preset) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (preset === 'today') {
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yestStr = yesterday.toISOString().slice(0, 10);
            setStartDate(yestStr);
            setEndDate(yestStr);
        } else {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - preset);
            setStartDate(start.toISOString().slice(0, 10));
            setEndDate(end.toISOString().slice(0, 10));
        }
    };

    return (
        <div>
            <PageHeader title="Sales Summary Report" description="Overall sales performance"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back to Reports
                </Button>} />

            <Card className="p-4 mb-6">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-full sm:w-40">
                        <Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-full sm:w-40">
                        <Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="w-full sm:w-36">
                        <Select label="Group By"
                            options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]}
                            value={groupBy} onChange={(e) => setGroupBy(e.target.value)} />
                    </div>
                    <div className="w-full sm:w-auto flex flex-wrap gap-1 sm:ml-auto">
                        <Button variant="outline" size="sm" onClick={() => applyPreset('today')}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset('yesterday')}>Yesterday</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>Last 7d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>Last 30d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(90)}>Last 90d</Button>
                    </div>
                </div>
            </Card>

            {isLoading || !s ? (
                <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KpiCard label="Total Orders" value={s.orders.totalOrders}
                            subtext={`Avg: ${fmt(s.orders.avgOrderValue)}`} />
                        <KpiCard label="Gross Order Value" value={fmt(s.orders.totalValue)} />
                        <KpiCard label="Invoiced" value={fmt(s.invoices.total)}
                            subtext={`${s.invoices.count} invoices`} />
                        <KpiCard label="Collected" value={fmt(s.payments.collected)}
                            subtext={`${s.collectionEfficiency}% efficiency`} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <Card className="col-span-2 p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Trend</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendData?.data || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v, name) => name === 'Orders Value' ? fmt(v) : v} />
                                    <Line yAxisId="left" type="monotone" dataKey="total" name="Orders Value"
                                        stroke="#6366f1" strokeWidth={2} dot={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="count" name="Order Count"
                                        stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">By Status</h3>
                            <div className="space-y-2 text-sm">
                                {s.statusBreakdown.map((st) => (
                                    <div key={st._id} className="flex justify-between items-center">
                                        <Badge>{st._id}</Badge>
                                        <div className="text-right">
                                            <p className="font-medium">{st.count}</p>
                                            <p className="text-xs text-gray-500">{fmt(st.value)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Financial Flow</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-xs text-blue-700">Invoiced</p>
                                <p className="text-xl font-bold text-blue-900">{fmt(s.invoices.total)}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-xs text-green-700">Collected</p>
                                <p className="text-xl font-bold text-green-900">{fmt(s.payments.collected)}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4">
                                <p className="text-xs text-amber-700">Outstanding</p>
                                <p className="text-xl font-bold text-amber-900">{fmt(s.invoices.balance)}</p>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}