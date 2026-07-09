import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
    useBakeryProducts,
    useBakeryStructures,
    useCreateNuwaraEliyaDelivery,
    useUpdateNuwaraEliyaDelivery,
    useNuwaraEliyaDelivery,
    useLatestNuwaraEliyaOutstanding
} from '../features/bakery/useBakery';
import toast from 'react-hot-toast';

export default function NuwaraEliyaLoadTripPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    // React query hooks
    const { data: productsRes } = useBakeryProducts();
    const { data: structuresRes } = useBakeryStructures();
    const { data: deliveryRes, isLoading: deliveryLoading } = useNuwaraEliyaDelivery(id);
    const { data: latestRes } = useLatestNuwaraEliyaOutstanding();

    const createDelivery = useCreateNuwaraEliyaDelivery();
    const updateDelivery = useUpdateNuwaraEliyaDelivery();

    const dbProducts = productsRes?.data || [];
    const dbStructures = structuresRes?.data || [];

    // Form fields
    const [date, setDate] = useState('');
    const [selectedStructureId, setSelectedStructureId] = useState('');
    const [loadedItems, setLoadedItems] = useState([]);
    const [previousOutstanding, setPreviousOutstanding] = useState(0);
    const [previousOnBoardStockCost, setPreviousOnBoardStockCost] = useState(0);
    const [previousShopsOutstanding, setPreviousShopsOutstanding] = useState(0);
    const [specialRemarks, setSpecialRemarks] = useState('');

    // Autocomplete state
    const [activeSuggest, setActiveSuggest] = useState({ index: null });
    const [searchTerm, setSearchTerm] = useState('');

    // Set today's date on create
    useEffect(() => {
        if (!isEdit) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);
        }
    }, [isEdit]);

    // Load latest outstanding balances on create
    useEffect(() => {
        if (!isEdit && latestRes) {
            setPreviousOutstanding(latestRes.nextOutstanding || 0);
            setPreviousOnBoardStockCost(latestRes.onBoardStockCost || 0);
            setPreviousShopsOutstanding(latestRes.shopsOutstanding || 0);
        }
    }, [latestRes, isEdit]);

    // Fill form on edit mode
    useEffect(() => {
        if (isEdit && deliveryRes?.data) {
            const del = deliveryRes.data;
            
            // Format date to YYYY-MM-DD
            const delDate = new Date(del.date);
            const yyyy = delDate.getFullYear();
            const mm = String(delDate.getMonth() + 1).padStart(2, '0');
            const dd = String(delDate.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);

            setSelectedStructureId(del.structureId || '');
            setLoadedItems(del.loadedItems || []);
            setPreviousOutstanding(del.previousOutstanding || 0);
            setPreviousOnBoardStockCost(del.previousOnBoardStockCost || 0);
            setPreviousShopsOutstanding(del.previousShopsOutstanding || 0);
            setSpecialRemarks(del.specialRemarks || '');
        }
    }, [isEdit, deliveryRes]);

    const handleAddItemRow = () => {
        setLoadedItems(prev => [...prev, { productName: '', price: 0, qty: 0 }]);
    };

    const handleRemoveItemRow = (idx) => {
        setLoadedItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleStructureChange = (structureId) => {
        setSelectedStructureId(structureId);
        if (!structureId) return;

        const structure = dbStructures.find(s => s._id === structureId);
        if (!structure) return;

        // Apply new structure prices to currently loaded items
        setLoadedItems(prev => prev.map(item => {
            const structPrice = structure.prices.find(
                sp => sp.productName.toLowerCase() === item.productName.toLowerCase()
            );
            return {
                ...item,
                price: structPrice ? structPrice.price : item.price
            };
        }));

        toast.success(`Applied prices from "${structure.name}"`);
    };

    const handlePrepopulateFromStructure = () => {
        if (!selectedStructureId) {
            toast.error('Please select a pricing structure first');
            return;
        }
        const structure = dbStructures.find(s => s._id === selectedStructureId);
        if (!structure) return;

        const newLoaded = structure.prices.map(sp => ({
            productName: sp.productName,
            price: sp.price,
            qty: 0
        }));

        setLoadedItems(newLoaded);
        toast.success(`Loaded products from "${structure.name}" pricing structure`);
    };

    const handleItemFieldChange = (idx, field, value) => {
        setLoadedItems(prev => {
            const copy = [...prev];
            if (field === 'productName') {
                copy[idx].productName = value;
                
                // Auto-fill price if it matches pricing structure
                if (selectedStructureId) {
                    const structure = dbStructures.find(s => s._id === selectedStructureId);
                    const structPrice = structure?.prices.find(
                        sp => sp.productName.toLowerCase() === value.trim().toLowerCase()
                    );
                    if (structPrice) {
                        copy[idx].price = structPrice.price;
                    }
                }
            } else {
                copy[idx][field] = Number(value) || 0;
            }
            return copy;
        });
    };

    const handleSelectProductSuggestion = (idx, productName) => {
        handleItemFieldChange(idx, 'productName', productName);
        setActiveSuggest({ index: null });
    };

    const loadCost = loadedItems.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
    const subtotal = loadCost + previousOutstanding + previousOnBoardStockCost + previousShopsOutstanding;

    const handleSubmit = (e) => {
        e.preventDefault();

        const validLoaded = loadedItems.filter(it => it.productName.trim() !== '' && Number(it.qty || 0) > 0);
        if (validLoaded.length === 0) {
            toast.error('Please add at least one loaded product with quantity > 0');
            return;
        }

        const structure = dbStructures.find(s => s._id === selectedStructureId);

        const data = {
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            loadedItems: validLoaded,
            previousOutstanding: Number(previousOutstanding),
            previousOnBoardStockCost: Number(previousOnBoardStockCost),
            previousShopsOutstanding: Number(previousShopsOutstanding),
            specialRemarks: specialRemarks.trim(),
            structureId: selectedStructureId || null,
            structureName: structure ? structure.name : '',
            status: 'loaded' // Always saves as loaded in step 1
        };

        if (isEdit) {
            // Keep existing settlement deductions unchanged (if editing an already settled trip loads)
            const orig = deliveryRes?.data || {};
            const payload = {
                ...data,
                bankDeposits: orig.bankDeposits || 0,
                returnedItems: orig.returnedItems || [],
                onBoardItems: orig.onBoardItems || [],
                shopsOutstanding: orig.shopsOutstanding || 0,
                amountPaid: orig.amountPaid || 0,
                status: orig.status || 'loaded'
            };
            updateDelivery.mutate(
                { id, data: payload },
                {
                    onSuccess: () => navigate('/bakery/nuwara-eliya')
                }
            );
        } else {
            createDelivery.mutate(data, {
                onSuccess: () => navigate('/bakery/nuwara-eliya')
            });
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    if (isEdit && deliveryLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => navigate('/bakery/nuwara-eliya')}
                    className="p-2 bg-white border border-gray-205 hover:bg-gray-50 rounded-xl transition text-gray-650"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                        {isEdit ? 'Edit Departure Load' : 'Trip Departure: Load Products'}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        Create loaded bill for the driver before departing to Nuwara Eliya.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Loaded Items */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-5 space-y-4">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b pb-2.5">
                                <h3 className="font-bold text-gray-800 text-sm">Products Loaded (Total Load Cost)</h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search loaded items..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                                    />
                                    {selectedStructureId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="xs"
                                            onClick={handlePrepopulateFromStructure}
                                            className="flex items-center gap-1 text-xs border-indigo-250 text-indigo-700 hover:bg-indigo-50"
                                        >
                                            Load from Structure
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        onClick={handleAddItemRow}
                                        className="flex items-center gap-1 text-xs"
                                    >
                                        <Plus size={12} />
                                        Add Product
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[120px]">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-3 py-2 text-left" style={{ width: '50%' }}>Product Name</th>
                                            <th className="px-2 py-2 text-right" style={{ width: '22%' }}>Price (LKR)</th>
                                            <th className="px-2 py-2 text-right" style={{ width: '18%' }}>Quantity</th>
                                            <th className="px-3 py-2 text-right" style={{ width: '20%' }}>Subtotal</th>
                                            <th className="py-2 text-center" style={{ width: '5%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center text-gray-400 py-6 italic">
                                                    No items added. Click 'Add Product' or 'Load from Structure' to begin.
                                                </td>
                                            </tr>
                                        ) : (
                                            loadedItems
                                                .map((item, idx) => ({ ...item, originalIdx: idx }))
                                                .filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map((item) => {
                                                    const idx = item.originalIdx;
                                                    const matchingProducts = item.productName
                                                        ? dbProducts.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase()))
                                                        : [];

                                                    return (
                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                            <td className="px-3 py-2.5 relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Type product name..."
                                                                    value={item.productName}
                                                                    onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                                                                    onFocus={() => setActiveSuggest({ index: idx })}
                                                                    className="w-full bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                                                                />
                                                                {activeSuggest.index === idx && item.productName && matchingProducts.length > 0 && (
                                                                    <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-250 rounded-lg shadow-lg z-50 max-h-36 overflow-y-auto py-1">
                                                                        {matchingProducts.map((p) => (
                                                                            <button
                                                                                key={p._id}
                                                                                type="button"
                                                                                onClick={() => handleSelectProductSuggestion(idx, p.name)}
                                                                                className="w-full px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 transition text-left text-xs font-semibold text-gray-700"
                                                                            >
                                                                                {p.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2.5">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    value={item.price === 0 ? '' : item.price}
                                                                    onChange={(e) => handleItemFieldChange(idx, 'price', e.target.value)}
                                                                    className="w-full bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold text-right focus:outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={item.qty === 0 ? '' : item.qty}
                                                                    onChange={(e) => handleItemFieldChange(idx, 'qty', e.target.value)}
                                                                    className="w-full bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold text-right focus:outline-none"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-bold text-gray-700">
                                                                {formatPrice((item.qty || 0) * (item.price || 0))}
                                                            </td>
                                                            <td className="py-2.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItemRow(idx)}
                                                                    className="p-1 text-gray-400 hover:text-red-655 rounded transition"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* Parameters & Calculation */}
                    <div className="space-y-6">
                        <Card className="p-6 space-y-4">
                            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Trip Parameters</h3>
                            <Input
                                label="Loading Date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pricing Structure</label>
                                <select
                                    value={selectedStructureId}
                                    onChange={(e) => handleStructureChange(e.target.value)}
                                    className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-755 focus:outline-none"
                                >
                                    <option value="">-- No Structure (Manual Prices) --</option>
                                    {dbStructures.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Previous Trip Outstanding</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={previousOutstanding === 0 ? '' : previousOutstanding}
                                        onChange={(e) => setPreviousOutstanding(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Previous On-board Stock</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={previousOnBoardStockCost === 0 ? '' : previousOnBoardStockCost}
                                        onChange={(e) => setPreviousOnBoardStockCost(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Previous Shops Naya</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={previousShopsOutstanding === 0 ? '' : previousShopsOutstanding}
                                        onChange={(e) => setPreviousShopsOutstanding(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>
                        </Card>

                        {/* Bill Summary */}
                        <Card className="p-6 space-y-4 bg-indigo-50/20 border-indigo-100">
                            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Load Bill Summary</h3>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-500">Trip Loaded Cost:</span>
                                    <span className="text-gray-850 font-bold">{formatPrice(loadCost)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-500">Previous Outstanding:</span>
                                    <span className="text-gray-850 font-bold">+{formatPrice(previousOutstanding)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-500">Previous On-board Stock:</span>
                                    <span className="text-gray-850 font-bold">+{formatPrice(previousOnBoardStockCost)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-gray-500">Previous Shops Naya:</span>
                                    <span className="text-gray-850 font-bold">+{formatPrice(previousShopsOutstanding)}</span>
                                </div>
                                <div className="flex justify-between font-extrabold text-sm border-t pt-2.5 text-indigo-950 bg-indigo-50 p-2.5 rounded border border-indigo-150 mt-2">
                                    <span>Total Loaded Bill:</span>
                                    <span>{formatPrice(subtotal)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Remarks */}
                <Card className="p-6">
                    <h3 className="font-bold text-gray-800 text-sm mb-3">Remarks / Loading Notes</h3>
                    <textarea
                        rows="2"
                        placeholder="Add special instructions, vehicle number, driver details, etc..."
                        value={specialRemarks}
                        onChange={(e) => setSpecialRemarks(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-750 focus:outline-none"
                    />
                </Card>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/bakery/nuwara-eliya')}
                        disabled={createDelivery.isPending || updateDelivery.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={createDelivery.isPending || updateDelivery.isPending}
                        className="flex items-center gap-2"
                    >
                        <Save size={16} />
                        {isEdit ? 'Save Changes' : 'Generate Load Bill'}
                    </Button>
                </div>
            </form>

            {activeSuggest.index !== null && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setActiveSuggest({ index: null })}
                />
            )}
        </div>
    );
}
