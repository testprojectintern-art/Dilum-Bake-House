import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, PackageCheck, Truck, Warehouse as WarehouseIcon, Calendar, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';

export default function GrnsPage() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({ search: '', page: 1, limit: 15 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form state for new GRN (direct)
    const [supplierId, setSupplierId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [items, setItems] = useState([{ productId: '', receivedQuantity: 1, unitPrice: 0 }]);

    const { data, isLoading } = useQuery({
        queryKey: ['grns', filters],
        queryFn: async () => {
            const { data } = await api.get('/grns', { params: filters });
            return data;
        }
    });

    const { data: suppliersData } = useQuery({ queryKey: ['suppliers', 'active'], queryFn: async () => (await api.get('/suppliers?status=active')).data });
    const { data: warehousesData } = useQuery({ queryKey: ['warehouses', 'active'], queryFn: async () => (await api.get('/warehouses?isActive=true')).data });
    const { data: productsData } = useQuery({ queryKey: ['products', 'all'], queryFn: async () => (await api.get('/products?limit=500')).data });

    const createMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.post('/grns', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grns'] });
            toast.success('Goods received successfully');
            setIsFormOpen(false);
            setItems([{ productId: '', receivedQuantity: 1, unitPrice: 0 }]);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/grns/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grns'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('GRN cancelled and stock reversed');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Cancellation failed')
    });

    const grns = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n || 0);

    const columns = [
        { key: 'grnNumber', label: 'GRN #', render: (r) => <span className="font-mono font-bold text-gray-700">{r.grnNumber}</span> },
        { key: 'receiptDate', label: 'Date', render: (r) => new Date(r.receiptDate).toLocaleDateString() },
        { key: 'supplier', label: 'Supplier', render: (r) => r.supplierName || r.supplierId?.displayName },
        { key: 'warehouse', label: 'Warehouse', render: (r) => r.warehouseId?.name },
        { key: 'po', label: 'PO #', render: (r) => r.poNumber ? <Badge variant="info">{r.poNumber}</Badge> : <span className="text-gray-400">Direct</span> },
        { key: 'value', label: 'Total Value', render: (r) => <span className="font-bold">{fmt(r.totalReceivedValue)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'cancelled' ? 'danger' : 'success'}>{r.status}</Badge> },
        { 
            key: 'actions', label: '', render: (r) => (
                <div className="flex justify-end">
                    {r.status !== 'cancelled' && (
                        <button 
                            onClick={() => { if(window.confirm(`Cancel GRN ${r.grnNumber}? Stock will be reversed.`)) deleteMutation.mutate(r._id) }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Cancel GRN"
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const addLine = () => setItems([...items, { productId: '', receivedQuantity: 1, unitPrice: 0 }]);
    const removeLine = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateLine = (idx, f, v) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [f]: v };
        if (f === 'productId' && v) {
            const p = productsData?.data?.find(x => x._id === v);
            if (p) newItems[idx].unitPrice = p.basePrice || 0;
        }
        setItems(newItems);
    };

    const submit = () => {
        if (!supplierId || !warehouseId) return toast.error('Select supplier and warehouse');
        const validItems = items.filter(i => i.productId && i.receivedQuantity > 0);
        if (validItems.length === 0) return toast.error('Add at least one item');

        createMutation.mutate({
            supplierId, warehouseId,
            items: validItems.map(i => ({ ...i, receivedQuantity: +i.receivedQuantity, acceptedQuantity: +i.receivedQuantity, unitPrice: +i.unitPrice }))
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Goods Received Notes" 
                description="View and record incoming goods (GRNs)"
                icon={PackageCheck}
                actions={
                    <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> New Direct GRN
                    </Button>
                }
            />

            <Card>
                <div className="p-4 border-b">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by GRN number..." 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                            value={filters.search}
                            onChange={(e) => setFilters({...filters, search: e.target.value, page: 1})}
                        />
                    </div>
                </div>
                {isLoading ? <div className="py-20 text-center">Loading...</div> : <Table columns={columns} data={grns} />}
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Direct GRN (No PO)" size="lg">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Supplier" required options={(suppliersData?.data || []).map(s => ({ value: s._id, label: s.displayName }))}
                            value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
                        <Select label="Warehouse" required options={(warehousesData?.data || []).map(w => ({ value: w._id, label: w.name }))}
                            value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold">Items</h4>
                            <Button size="sm" variant="outline" onClick={addLine}>Add Item</Button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-5 gap-2 border p-2 rounded items-end">
                                    <div className="col-span-2">
                                        <Select placeholder="Product..." options={(productsData?.data || []).map(p => ({ value: p._id, label: p.name }))}
                                            value={item.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)} />
                                    </div>
                                    <Input type="number" label="Qty" value={item.receivedQuantity} onChange={(e) => updateLine(idx, 'receivedQuantity', e.target.value)} />
                                    <Input type="number" label="Unit Price" value={item.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                                    <Button variant="outline" size="sm" onClick={() => removeLine(idx)} className="text-red-600 mb-1">Remove</Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                        <Button variant="primary" fullWidth onClick={submit} loading={createMutation.isPending}>Confirm Receipt</Button>
                        <Button variant="outline" fullWidth onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
