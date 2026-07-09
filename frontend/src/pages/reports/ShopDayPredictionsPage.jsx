import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, TrendingUp, RefreshCw, Calendar, Store, Info } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ShopDayPredictionsPage() {
    const navigate = useNavigate();
    // Default to today's day of week
    const [selectedShop, setSelectedShop] = useState('');
    const [selectedDay, setSelectedDay] = useState(new Date().getDay());
    const [showAllDays, setShowAllDays] = useState(false);

    const daysOfWeekList = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' }
    ];

    const todayDayName = daysOfWeekList.find(d => d.value === new Date().getDay())?.label;

    // First fetch: get the shops list (no shopName yet)
    const { data: shopsData } = useQuery({
        queryKey: ['shopPredictivePatterns_init'],
        queryFn: async () => {
            const res = await api.get('/reports/shop-predictive-patterns', { params: {} });
            return res.data;
        },
        staleTime: 0,
    });

    const shops = shopsData?.data?.shops || [];

    // Auto-select first shop when shops load
    useEffect(() => {
        if (shops.length > 0 && !selectedShop) {
            setSelectedShop(shops[0]);
        }
    }, [shops, selectedShop]);

    // Second fetch: get predictions for selected shop + day
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['shopPredictivePatterns', selectedShop, showAllDays ? 'all' : selectedDay],
        queryFn: async () => {
            const params = { shopName: selectedShop };
            if (!showAllDays) params.dayOfWeek = selectedDay;
            const res = await api.get('/reports/shop-predictive-patterns', { params });
            return res.data;
        },
        enabled: !!selectedShop,
        staleTime: 0,
    });

    const reportData = data?.data || {};
    const predictions = reportData.predictions || [];
    const historicalDaysCount = reportData.historicalDaysCount || 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Shop Day Demand Prediction"
                description="AI-driven demand planning using historic sales averages and returns"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isFetching}>
                            <RefreshCw size={14} className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Reload
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={14} className="mr-1.5" /> Back to Reports
                        </Button>
                    </div>
                }
            />

            {/* Filters panel */}
            <Card className="p-4 bg-white/70 backdrop-blur-md border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Shop / Route</label>
                        <select
                            value={selectedShop}
                            onChange={(e) => setSelectedShop(e.target.value)}
                            className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none h-10"
                        >
                            {shops.length === 0 && <option value="">Loading shops...</option>}
                            {shops.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Day of Week</label>
                        <select
                            value={selectedDay}
                            onChange={(e) => { setSelectedDay(Number(e.target.value)); setShowAllDays(false); }}
                            disabled={showAllDays}
                            className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none h-10 disabled:opacity-50"
                        >
                            {daysOfWeekList.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}{d.value === new Date().getDay() ? ' (Today)' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end pb-0.5">
                        <button
                            onClick={() => setShowAllDays(v => !v)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition h-10 ${showAllDays ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                        >
                            <Calendar size={13} />
                            {showAllDays ? 'All Days Combined ✓' : 'Show All Days'}
                        </button>
                    </div>
                </div>
            </Card>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border-indigo-500/10">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl">
                            <Store size={20} />
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Analyzing Shop</span>
                            <span className="text-base font-bold text-gray-800 uppercase">{selectedShop || '...'}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/10">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-purple-100 text-purple-700 p-2.5 rounded-xl">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Historical Sample</span>
                            <span className="text-xl font-bold text-gray-800">
                                {showAllDays ? 'All Days' : `${historicalDaysCount} ${historicalDaysCount === 1 ? 'Day' : 'Days'}`}
                            </span>
                            {!showAllDays && historicalDaysCount === 0 && selectedShop && (
                                <span className="block text-[10px] text-amber-500 font-medium mt-0.5">No {daysOfWeekList.find(d => d.value === selectedDay)?.label} data yet</span>
                            )}
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/10">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Products with Predictions</span>
                            <span className="text-xl font-bold text-gray-800">{predictions.length} Products</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Prediction Table */}
            <Card className="overflow-hidden bg-white shadow-sm rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">
                            Demand Predictions — {selectedShop} {showAllDays ? '(All Days)' : `(${daysOfWeekList.find(d => d.value === selectedDay)?.label}s)`}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Average quantities × 1.10 safety buffer = recommended load</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isLoading || isFetching ? (
                        <div className="py-12 text-center text-gray-400 font-semibold flex items-center justify-center gap-2">
                            <RefreshCw className="animate-spin" size={16} />
                            Loading demand prediction data...
                        </div>
                    ) : !selectedShop ? (
                        <div className="py-12 text-center text-gray-400 font-semibold">
                            Select a shop above to see predictions.
                        </div>
                    ) : predictions.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="flex justify-center">
                                <div className="bg-amber-50 text-amber-600 rounded-full p-4">
                                    <Info size={28} />
                                </div>
                            </div>
                            <p className="text-gray-600 font-semibold">No data for {daysOfWeekList.find(d => d.value === selectedDay)?.label}s yet</p>
                            <p className="text-gray-400 text-sm max-w-sm mx-auto">
                                No invoices have been recorded for <strong>{selectedShop}</strong> on a {daysOfWeekList.find(d => d.value === selectedDay)?.label} yet.
                                Try clicking <strong>"Show All Days"</strong> to see all available predictions.
                            </p>
                            <Button variant="outline" size="sm" onClick={() => setShowAllDays(true)} className="mx-auto">
                                <Calendar size={13} className="mr-1.5" />
                                Show All Days Combined
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/40 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-5 py-3">Product Name</th>
                                    <th className="px-5 py-3 text-right">Avg Delivered</th>
                                    <th className="px-5 py-3 text-right">Avg Returned</th>
                                    <th className="px-5 py-3 text-right text-indigo-600">Avg Sold</th>
                                    <th className="px-5 py-3 text-right text-emerald-600 font-bold bg-emerald-500/5">AI Recommended Load</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                                {predictions.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30 transition">
                                        <td className="px-5 py-3.5 font-bold text-gray-900">{p.productName}</td>
                                        <td className="px-5 py-3.5 text-right text-gray-600">{p.avgDelivered.toFixed(1)}</td>
                                        <td className="px-5 py-3.5 text-right text-red-500">
                                            {p.avgReturned > 0 ? `-${p.avgReturned.toFixed(1)}` : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-indigo-600 font-bold">{p.avgSold.toFixed(1)}</td>
                                        <td className="px-5 py-3.5 text-right bg-emerald-500/5">
                                            <span className="inline-flex items-center gap-1.5 font-black text-emerald-700">
                                                <TrendingUp size={13} className="text-emerald-500" />
                                                {p.recommendedQty} units
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}
