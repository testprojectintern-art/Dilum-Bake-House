import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Plus, Trash2, Save, X, Loader2, ArrowLeft, Search, RefreshCw, AlertTriangle
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import {
    useBakeryProducts,
    useBakeryStructures,
    useCreateBakeryInvoice,
    useUpdateBakeryInvoice,
    useBakeryInvoice
} from '../features/bakery/useBakery';
import { bakeryApi } from '../features/bakery/bakeryApi';
import toast from 'react-hot-toast';

export default function BakeryInvoiceFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    // React query hooks
    const { data: productsRes } = useBakeryProducts();
    const { data: structuresRes } = useBakeryStructures();
    const { data: invoiceRes, isLoading: invoiceLoading } = useBakeryInvoice(id);

    const createInvoice = useCreateBakeryInvoice();
    const updateInvoice = useUpdateBakeryInvoice();

    const dbProducts = productsRes?.data || [];
    const dbStructures = structuresRes?.data || [];

    // Form fields
    const [shopName, setShopName] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [date, setDate] = useState('');
    const [selectedStructureId, setSelectedStructureId] = useState('');
    const [items, setItems] = useState([]); // { productName: '', price: 0, morningQty: 0, afternoonQty: 0, returnQty: 0 }
    const [oldBalance, setOldBalance] = useState(0);
    const [amountReceived, setAmountReceived] = useState(0);
    const [specialNote, setSpecialNote] = useState('');

    // Suggestions states
    const [shopSuggestions, setShopSuggestions] = useState([]);
    const [showShopSuggestions, setShowShopSuggestions] = useState(false);
    const [activeRowSuggestIndex, setActiveRowSuggestIndex] = useState(null);

    const shopSuggestRef = useRef(null);

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

    // Fill form on edit mode
    useEffect(() => {
        if (isEdit && invoiceRes?.data) {
            const inv = invoiceRes.data;
            setShopName(inv.shopName);
            setShopPhone(inv.shopPhone || '');
            
            // Format date to YYYY-MM-DD
            const invDate = new Date(inv.date);
            const yyyy = invDate.getFullYear();
            const mm = String(invDate.getMonth() + 1).padStart(2, '0');
            const dd = String(invDate.getDate()).padStart(2, '0');
            setDate(`${yyyy}-${mm}-${dd}`);

            setSelectedStructureId(inv.structureId || '');
            setItems(inv.items.map(item => ({
                productName: item.productName,
                price: item.price,
                morningQty: item.morningQty,
                afternoonQty: item.afternoonQty,
                returnQty: item.returnQty
            })));
            setOldBalance(inv.oldBalance || 0);
            setAmountReceived(inv.amountReceived || 0);
            setSpecialNote(inv.specialNote || '');
        }
    }, [isEdit, invoiceRes]);

    // Handle Shop input and fetch suggestions
    const handleShopNameChange = async (val) => {
        setShopName(val);
        if (!val.trim()) {
            setShopSuggestions([]);
            setShowShopSuggestions(false);
            return;
        }

        try {
            const res = await bakeryApi.suggestShops(val);
            setShopSuggestions(res?.data || []);
            setShowShopSuggestions(true);
        } catch (err) {
            console.error('Error fetching shop suggestions', err);
        }
    };

    // Close suggestions dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (shopSuggestRef.current && !shopSuggestRef.current.contains(event.target)) {
                setShowShopSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Apply Shop selection
    const handleSelectShopSuggestion = (shop) => {
        setShopName(shop.name);
        setShopPhone(shop.phone || '');
        // On create, load their current outstanding balance. On edit, keep the saved invoice old balance
        if (!isEdit) {
            setOldBalance(shop.balance || 0);
        }
        setShopSuggestions([]);
        setShowShopSuggestions(false);
    };

    // Apply billing structure prices to current items or load products
    const handleStructureChange = (structureId) => {
        setSelectedStructureId(structureId);
        if (!structureId) return;

        const structure = dbStructures.find(s => s._id === structureId);
        if (!structure) return;

        // Load pricing structure items
        const structItems = structure.prices.map(sp => {
            // Check if product is already in our list, if so keep its quantities
            const existing = items.find(it => it.productName.toLowerCase() === sp.productName.toLowerCase());
            return {
                productName: sp.productName,
                price: sp.price,
                morningQty: existing ? existing.morningQty : 0,
                afternoonQty: existing ? existing.afternoonQty : 0,
                returnQty: existing ? existing.returnQty : 0
            };
        });

        // Add any manual items in the list that are NOT in the structure
        const structureProdNames = structure.prices.map(sp => sp.productName.toLowerCase());
        items.forEach(it => {
            if (!structureProdNames.includes(it.productName.toLowerCase())) {
                structItems.push(it);
            }
        });

        setItems(structItems);
        toast.success(`Applied prices from "${structure.name}"`);
    };

    // Items table manipulations
    const handleAddItemRow = () => {
        setItems(prev => [...prev, { productName: '', price: 0, morningQty: 0, afternoonQty: 0, returnQty: 0 }]);
    };

    const handleRemoveItemRow = (idx) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleItemFieldChange = (idx, field, value) => {
        setItems(prev => {
            const copy = [...prev];
            if (field === 'productName') {
                copy[idx].productName = value;
                
                // If it matches a product in the applied structure, update the price
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
        setActiveRowSuggestIndex(null);
    };

    // Calculate totals
    const deliveredTotal = items.reduce((sum, item) => sum + (item.morningQty + item.afternoonQty) * (item.price || 0), 0);
    const returnsTotal = items.reduce((sum, item) => sum + (item.returnQty) * (item.price || 0), 0);
    const grandTotal = oldBalance + deliveredTotal - returnsTotal;
    const newBalance = grandTotal - amountReceived;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!shopName.trim()) {
            toast.error('Shop name is required');
            return;
        }

        const validItems = items.filter(it => it.productName && it.productName.trim() !== '');
        if (validItems.length === 0) {
            toast.error('Please add at least one product with a name');
            return;
        }

        const structure = dbStructures.find(s => s._id === selectedStructureId);

        const data = {
            shopName: shopName.trim(),
            shopPhone: shopPhone.trim(),
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            structureId: selectedStructureId || null,
            structureName: structure ? structure.name : '',
            items: validItems,
            oldBalance: Number(oldBalance || 0),
            amountReceived: Number(amountReceived || 0),
            specialNote: specialNote.trim()
        };

        if (isEdit) {
            updateInvoice.mutate(
                { id, data },
                {
                    onSuccess: () => navigate('/bakery/invoices')
                }
            );
        } else {
            createInvoice.mutate(data, {
                onSuccess: () => navigate('/bakery/invoices')
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

    if (isEdit && invoiceLoading) {
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
                    onClick={() => navigate('/bakery/invoices')}
                    className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition text-gray-600"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                        {isEdit ? 'Edit Bakery Invoice' : 'Generate Bakery Invoice'}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                        Dilum Bake House daily invoice generator
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invoice Fields Card */}
                    <Card className="p-6 lg:col-span-2 space-y-6">
                        <h2 className="font-bold text-gray-800 text-base border-b pb-3">Shop & Billing Setup</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Shop Name Auto-suggest */}
                            <div className="relative" ref={shopSuggestRef}>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Shop Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type shop name (auto-suggests)..."
                                        value={shopName}
                                        onChange={(e) => handleShopNameChange(e.target.value)}
                                        onFocus={() => shopSuggestions.length > 0 && setShowShopSuggestions(true)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none"
                                        required
                                    />
                                </div>
                                {showShopSuggestions && shopSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {shopSuggestions.map((s) => (
                                            <button
                                                key={s._id}
                                                type="button"
                                                onClick={() => handleSelectShopSuggestion(s)}
                                                className="w-full flex items-center justify-between px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition text-left text-sm"
                                            >
                                                <span className="font-semibold">{s.name}</span>
                                                {s.phone && <span className="text-xs text-gray-400">({s.phone})</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Input
                                label="Phone Number(s)"
                                placeholder="e.g. 0762125472, 0774334046 (separate with commas)"
                                value={shopPhone}
                                onChange={(e) => setShopPhone(e.target.value)}
                            />

                            <Input
                                label="Invoice Date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />

                            <div className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pricing Structure</label>
                                <select
                                    value={selectedStructureId}
                                    onChange={(e) => handleStructureChange(e.target.value)}
                                    className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none"
                                >
                                    <option value="">No Structure (Manual Pricing)</option>
                                    {dbStructures.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Summary Card */}
                    <Card className="p-6 space-y-4">
                        <h2 className="font-bold text-gray-800 text-base border-b pb-3">Invoice Balance Summary</h2>

                        <div className="space-y-3 pt-2 text-sm">
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Delivered Total:</span>
                                <span className="text-gray-900">{formatPrice(deliveredTotal)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                                <span className="text-gray-500">Returns Total:</span>
                                <span className="text-red-500">-{formatPrice(returnsTotal)}</span>
                            </div>
                            
                            <div className="border-t pt-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Old Outstanding Balance</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={oldBalance === 0 ? '' : oldBalance}
                                        onChange={(e) => setOldBalance(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>

                            <div className="border-t pt-3 flex justify-between items-center font-bold text-base">
                                <span className="text-gray-800">Grand Total:</span>
                                <span className="text-indigo-600">{formatPrice(grandTotal)}</span>
                            </div>

                            <div className="border-t pt-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount Received Today</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={amountReceived === 0 ? '' : amountReceived}
                                        onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-8 pr-3 py-1.5 text-sm font-bold text-green-600 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>

                            <div className="border-t pt-3 flex justify-between items-center font-extrabold text-base bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                                <span className="text-gray-800">Remaining Balance:</span>
                                <span className={newBalance > 0 ? "text-amber-700" : "text-green-700"}>
                                    {formatPrice(newBalance)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Items details table */}
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h2 className="font-bold text-gray-800 text-base">Delivered Products & Returns</h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddItemRow}
                            className="flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Add Product Line
                        </Button>
                    </div>

                    <div className="overflow-x-auto min-h-[250px]">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                                    <th className="px-4 py-2.5 text-left" style={{ width: '35%' }}>Product Name</th>
                                    <th className="px-3 py-2.5 text-right" style={{ width: '15%' }}>Price (LKR)</th>
                                    <th className="px-3 py-2.5 text-right" style={{ width: '12%' }}>Morning Delivered</th>
                                    <th className="px-3 py-2.5 text-right" style={{ width: '12%' }}>Afternoon Delivered</th>
                                    <th className="px-3 py-2.5 text-right" style={{ width: '12%' }}>Returns</th>
                                    <th className="px-4 py-2.5 text-right" style={{ width: '10%' }}>Net Subtotal</th>
                                    <th className="py-2.5 text-center" style={{ width: '4%' }}></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center text-gray-400 py-12">
                                            No products added yet. Choose a billing structure above or click 'Add Product Line'.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => {
                                        // Filter product suggestions locally
                                        const matchingProducts = item.productName
                                            ? dbProducts.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase()))
                                            : [];

                                        const netSub = ((item.morningQty + item.afternoonQty) - item.returnQty) * (item.price || 0);

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 relative">
                                                    {/* Autocomplete Input */}
                                                    <input
                                                        type="text"
                                                        placeholder="Type product name..."
                                                        value={item.productName}
                                                        onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                                                        onFocus={() => setActiveRowSuggestIndex(idx)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none"
                                                        required
                                                    />
                                                    {/* Floating suggestions dropdown */}
                                                    {activeRowSuggestIndex === idx && item.productName && matchingProducts.length > 0 && (
                                                        <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                            {matchingProducts.map((p) => (
                                                                <button
                                                                    key={p._id}
                                                                    type="button"
                                                                    onClick={() => handleSelectProductSuggestion(idx, p.name)}
                                                                    className="w-full px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition text-left text-sm font-semibold"
                                                                >
                                                                    {p.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={item.price === 0 ? '' : item.price}
                                                        onChange={(e) => handleItemFieldChange(idx, 'price', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-700 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.morningQty === 0 ? '' : item.morningQty}
                                                        onChange={(e) => handleItemFieldChange(idx, 'morningQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-750 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.afternoonQty === 0 ? '' : item.afternoonQty}
                                                        onChange={(e) => handleItemFieldChange(idx, 'afternoonQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-750 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.returnQty === 0 ? '' : item.returnQty}
                                                        onChange={(e) => handleItemFieldChange(idx, 'returnQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-red-600 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                    {formatPrice(netSub)}
                                                </td>
                                                <td className="py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(idx)}
                                                        className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                                                        title="Remove Row"
                                                    >
                                                        <Trash2 size={16} />
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

                {/* Special Note Card */}
                <Card className="p-6">
                    <h2 className="font-bold text-gray-800 text-base mb-3">Special Remarks / Note</h2>
                    <textarea
                        rows="2"
                        placeholder="Add any special instructions, remarks or notes for this bill..."
                        value={specialNote}
                        onChange={(e) => setSpecialNote(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-750 focus:outline-none"
                    />
                </Card>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/bakery/invoices')}
                        disabled={createInvoice.isPending || updateInvoice.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={createInvoice.isPending || updateInvoice.isPending}
                        className="flex items-center gap-2"
                    >
                        <Save size={16} />
                        {isEdit ? 'Save Invoice' : 'Generate Invoice'}
                    </Button>
                </div>
            </form>

            {/* Backdrop helper to dismiss row autocompletes */}
            {activeRowSuggestIndex !== null && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setActiveRowSuggestIndex(null)}
                />
            )}
        </div>
    );
}
