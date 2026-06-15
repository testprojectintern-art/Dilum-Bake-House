import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, CheckCircle, Trash2, Calendar, ShoppingBag, Percent, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useProducts } from '../features/products/useProducts';

export default function TargetsProgressPage() {
    const queryClient = useQueryClient();
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [targetType, setTargetType] = useState('monthly');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deletingTarget, setDeletingTarget] = useState(null);

    // Form state
    const [form, setForm] = useState({
        targetType: 'monthly',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        productId: '',
        targetAmount: '',
        notes: ''
    });

    const { data: productsRes } = useProducts({ limit: 1000, status: 'active' });
    const products = productsRes?.data || [];
    const productOptions = products.map(p => ({ value: p._id, label: p.name }));

    // Fetch progress
    const { data: progressRes, isLoading } = useQuery({
        queryKey: ['targetsProgress', targetType, year, month],
        queryFn: async () => {
            const res = await axios.get('/targets/progress', {
                params: { year, month, targetType }
            });
            return res.data;
        }
    });

    const targets = progressRes?.data?.targets || [];

    // Save target mutation
    const saveTargetMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await axios.post('/targets', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Target set successfully');
            queryClient.invalidateQueries({ queryKey: ['targetsProgress'] });
            setIsAddOpen(false);
            setForm({
                targetType: 'monthly',
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
                productId: '',
                targetAmount: '',
                notes: ''
            });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to save target');
        }
    });

    // Delete target mutation
    const deleteTargetMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axios.delete(`/targets/${id}`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Target deleted');
            queryClient.invalidateQueries({ queryKey: ['targetsProgress'] });
            setDeletingTarget(null);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) {
            toast.error('Please enter a valid target amount');
            return;
        }
        
        const payload = {
            ...form,
            targetAmount: parseFloat(form.targetAmount),
            productId: form.productId || undefined,
            month: form.targetType === 'monthly' ? parseInt(form.month) : undefined
        };

        saveTargetMutation.mutate(payload);
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

    const getProgressColor = (pct) => {
        if (pct >= 100) return 'bg-emerald-500';
        if (pct >= 50) return 'bg-blue-500';
        return 'bg-amber-500';
    };

    const getProgressBg = (pct) => {
        if (pct >= 100) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (pct >= 50) return 'bg-blue-50 text-blue-700 border-blue-100';
        return 'bg-amber-50 text-amber-700 border-amber-100';
    };

    return (
        <div>
            <PageHeader 
                title="Targets & Progress" 
                description="Set monthly/annual targets and track achievement percentages in real-time"
                actions={
                    <Button variant="primary" onClick={() => setIsAddOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> Set Target
                    </Button>
                }
            />

            {/* Filter Panel */}
            <Card className="p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="w-36">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Target Type</label>
                        <Select
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'annual', label: 'Annual' }
                            ]}
                            value={targetType}
                            onChange={(e) => {
                                setForm(f => ({ ...f, targetType: e.target.value }));
                                setTargetType(e.target.value);
                            }}
                        />
                    </div>
                    <div className="w-32">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Year</label>
                        <Select
                            options={Array.from({ length: 5 }, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return { value: y, label: String(y) };
                            })}
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        />
                    </div>
                    {targetType === 'monthly' && (
                        <div className="w-36">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Month</label>
                            <Select
                                options={[
                                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
                                ]}
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                            />
                        </div>
                    )}
                </div>
            </Card>

            {/* Targets Progress Grid */}
            {isLoading ? (
                <div className="py-20 text-center text-gray-500">Loading targets...</div>
            ) : targets.length === 0 ? (
                <Card className="p-12 text-center text-gray-400 border border-dashed border-gray-300">
                    <Target size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No targets configured for this period.</p>
                    <p className="text-xs text-gray-500 mt-1">Get started by setting your first monthly or annual target.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAddOpen(true)}>
                        <Plus size={14} className="mr-1" /> Add Target Now
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {targets.map((t) => (
                        <Card key={t._id} className="p-6 relative overflow-hidden flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-indigo-600 mb-1 bg-indigo-50 px-2 py-0.5 rounded-full">
                                        {t.targetType} Target
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                        {t.product ? t.product.name : 'All Store Sales'}
                                    </h3>
                                    {t.product && <p className="text-[10px] text-gray-400 font-mono mt-0.5">Product Code: {t.product.code}</p>}
                                </div>
                                <button
                                    onClick={() => setDeletingTarget(t)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                    title="Delete Target"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 py-3 bg-gray-50/50 border rounded-xl px-4 mb-4 dark:bg-gray-800">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Goal</p>
                                    <p className="text-sm font-extrabold text-gray-800 mt-0.5">{fmt(t.targetAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Actual Sales</p>
                                    <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{fmt(t.actualAmount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Achieved</p>
                                    <p className="text-sm font-extrabold text-indigo-600 mt-0.5">{t.percentage}%</p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full">
                                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span>{t.percentage}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(t.percentage)}`}
                                        style={{ width: `${Math.min(100, t.percentage)}%` }}
                                    />
                                </div>
                            </div>

                            {t.notes && (
                                <p className="text-xs text-gray-500 italic mt-4 border-t pt-2.5">
                                    Notes: {t.notes}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Set Target Modal */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Set Target Goal" size="md">
                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Target Type"
                                options={[
                                    { value: 'monthly', label: 'Monthly Target' },
                                    { value: 'annual', label: 'Annual Target' }
                                ]}
                                value={form.targetType}
                                onChange={(e) => setForm(f => ({ ...f, targetType: e.target.value }))}
                            />
                            <Select
                                label="Year"
                                options={Array.from({ length: 5 }, (_, i) => {
                                    const y = new Date().getFullYear() - 1 + i;
                                    return { value: y, label: String(y) };
                                })}
                                value={form.year}
                                onChange={(e) => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                            />
                        </div>

                        {form.targetType === 'monthly' && (
                            <Select
                                label="Month"
                                options={[
                                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
                                ]}
                                value={form.month}
                                onChange={(e) => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                            />
                        )}

                        <Select
                            label="Target Product (Optional)"
                            placeholder="Store-wide Sales Target"
                            options={productOptions}
                            value={form.productId}
                            onChange={(e) => setForm(f => ({ ...f, productId: e.target.value }))}
                        />

                        <Input
                            label="Target Sales Amount (LKR)"
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            value={form.targetAmount}
                            onChange={(e) => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                        />

                        <Input
                            label="Notes / Comments"
                            placeholder="Explain the strategy for this target..."
                            value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </div>

                    <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                        <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={saveTargetMutation.isPending}>Save Target</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={!!deletingTarget} 
                onClose={() => setDeletingTarget(null)}
                onConfirm={() => deleteTargetMutation.mutate(deletingTarget._id)}
                title="Delete Target" 
                message={`Are you sure you want to delete this target goal?`} 
                variant="danger" 
            />
        </div>
    );
}
