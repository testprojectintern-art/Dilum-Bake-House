import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Calendar, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
    useBakeryProducts,
    useUpdateNuwaraEliyaDelivery,
    useNuwaraEliyaDelivery
} from '../features/bakery/useBakery';
import toast from 'react-hot-toast';

export default function NuwaraEliyaSettleTripPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    // React query hooks
    const { data: productsRes } = useBakeryProducts();
    const { data: deliveryRes, isLoading: deliveryLoading } = useNuwaraEliyaDelivery(id);
    const updateDelivery = useUpdateNuwaraEliyaDelivery();

    const dbProducts = productsRes?.data || [];

    // Fields to load from existing trip record (read-only metadata)
    const [billNumber, setBillNumber] = useState('');
    const [dateText, setDateText] = useState('');
    const [loadCost, setLoadCost] = useState(0);
    const [previousOutstanding, setPreviousOutstanding] = useState(0);
    const [previousOnBoardStockCost, setPreviousOnBoardStockCost] = useState(0);
    const [previousShopsOutstanding, setPreviousShopsOutstanding] = useState(0);
    const [loadedItems, setLoadedItems] = useState([]);

    // Settlement inputs
    const [bankDeposits, setBankDeposits] = useState(0);
    const [returnedItems, setReturnedItems] = useState([]);
    const [onBoardItems, setOnBoardItems] = useState([]);
    const [shopsOutstanding, setShopsOutstanding] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);
    const [specialRemarks, setSpecialRemarks] = useState('');
    const [returnSearch, setReturnSearch] = useState('');
    const [onBoardSearch, setOnBoardSearch] = useState('');

    // Autocomplete suggestions
    const [activeSuggest, setActiveSuggest] = useState({ type: null, index: null });

    // Load data from deliveryRes
    useEffect(() => {
        if (deliveryRes?.data) {
            const del = deliveryRes.data;
            setBillNumber(del.billNumber);
            setDateText(new Date(del.date).toLocaleDateString('en-LK', { dateStyle: 'long' }));
            setLoadCost(del.loadCost || 0);
            setPreviousOutstanding(del.previousOutstanding || 0);
            setPreviousOnBoardStockCost(del.previousOnBoardStockCost || 0);
            setPreviousShopsOutstanding(del.previousShopsOutstanding || 0);
            setLoadedItems(del.loadedItems || []);

            // Populate existing values if they are already partially settled or editing settlement
            setBankDeposits(del.bankDeposits || 0);
            setReturnedItems(del.returnedItems?.length > 0 ? del.returnedItems : []);
            setOnBoardItems(del.onBoardItems?.length > 0 ? del.onBoardItems : []);
            setShopsOutstanding(del.shopsOutstanding || 0);
            setAmountPaid(del.amountPaid || 0);
            setSpecialRemarks(del.specialRemarks || '');
        }
    }, [deliveryRes]);

    const handleAddItemRow = (type) => {
        const row = { productName: '', price: 0, qty: 0 };
        if (type === 'returned') setReturnedItems(prev => [...prev, row]);
        if (type === 'onboard') setOnBoardItems(prev => [...prev, row]);
    };

    const handleRemoveItemRow = (type, idx) => {
        if (type === 'returned') setReturnedItems(prev => prev.filter((_, i) => i !== idx));
        if (type === 'onboard') setOnBoardItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleItemFieldChange = (type, idx, field, value) => {
        const updater = (prev) => {
            const copy = [...prev];
            if (field === 'productName') {
                copy[idx].productName = value;
                
                // If it matches loadedItems, auto-populate the loaded price!
                const matchedLoad = loadedItems.find(it => it.productName.toLowerCase() === value.trim().toLowerCase());
                if (matchedLoad) {
                    copy[idx].price = matchedLoad.price;
                }
            } else {
                copy[idx][field] = Number(value) || 0;
            }
            return copy;
        };

        if (type === 'returned') setReturnedItems(updater);
        if (type === 'onboard') setOnBoardItems(updater);
    };

    const handleSelectProductSuggestion = (type, idx, productName) => {
        handleItemFieldChange(type, idx, 'productName', productName);
        setActiveSuggest({ type: null, index: null });
    };

    // Calculations
    const returnsCost = returnedItems.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);
    const onBoardStockCost = onBoardItems.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0);

    const grossSubtotal = loadCost + previousOutstanding + previousOnBoardStockCost + previousShopsOutstanding;
    const totalDeductions = bankDeposits + returnsCost + onBoardStockCost + shopsOutstanding;
    const netOutstanding = grossSubtotal - totalDeductions;
    const nextOutstanding = netOutstanding - amountPaid;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validations
        const validReturns = returnedItems.filter(it => it.productName.trim() !== '' && Number(it.qty || 0) > 0);
        const validOnBoard = onBoardItems.filter(it => it.productName.trim() !== '' && Number(it.qty || 0) > 0);

        const data = {
            loadedItems,
            loadCost,
            previousOutstanding,
            previousOnBoardStockCost,
            previousShopsOutstanding,
            bankDeposits: Number(bankDeposits),
            returnedItems: validReturns,
            onBoardItems: validOnBoard,
            shopsOutstanding: Number(shopsOutstanding),
            amountPaid: Number(amountPaid),
            specialRemarks: specialRemarks.trim(),
            status: 'settled' // Mark as settled
        };

        updateDelivery.mutate(
            { id, data },
            {
                onSuccess: () => navigate('/bakery/nuwara-eliya')
            }
        );
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    if (deliveryLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    const renderItemsTable = (type, title, itemsList, searchVal, setSearchVal) => {
        return (
            <Card className="p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b pb-2.5">
                    <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="bg-white border border-gray-250 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => handleAddItemRow(type)}
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
                            {itemsList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center text-gray-400 py-6 italic">
                                        No items added. Click 'Add Product' to begin.
                                    </td>
                                </tr>
                            ) : (
                                itemsList
                                    .map((item, idx) => ({ ...item, originalIdx: idx }))
                                    .filter(item => item.productName.toLowerCase().includes(searchVal.toLowerCase()))
                                    .map((item) => {
                                        const idx = item.originalIdx;
                                        // Suggest from loaded items first or db products
                                        const matchingSuggestions = item.productName
                                            ? loadedItems.filter(p => p.productName.toLowerCase().includes(item.productName.toLowerCase()))
                                            : [];

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-3 py-2.5 relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Type product name..."
                                                        value={item.productName}
                                                        onChange={(e) => handleItemFieldChange(type, idx, 'productName', e.target.value)}
                                                        onFocus={() => setActiveSuggest({ type, index: idx })}
                                                        className="w-full bg-white border border-gray-255 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
                                                    />
                                                    {activeSuggest.type === type && activeSuggest.index === idx && item.productName && matchingSuggestions.length > 0 && (
                                                        <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-250 rounded-lg shadow-lg z-50 max-h-36 overflow-y-auto py-1">
                                                            {matchingSuggestions.map((p, sIdx) => (
                                                                <button
                                                                    key={sIdx}
                                                                    type="button"
                                                                    onClick={() => handleSelectProductSuggestion(type, idx, p.productName)}
                                                                    className="w-full px-3 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 transition text-left text-xs font-semibold text-gray-700"
                                                                >
                                                                    {p.productName}
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
                                                        onChange={(e) => handleItemFieldChange(type, idx, 'price', e.target.value)}
                                                        className="w-full bg-white border border-gray-255 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold text-right focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.qty === 0 ? '' : item.qty}
                                                        onChange={(e) => handleItemFieldChange(type, idx, 'qty', e.target.value)}
                                                        className="w-full bg-white border border-gray-255 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold text-right focus:outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-bold text-gray-700">
                                                    {formatPrice((item.qty || 0) * (item.price || 0))}
                                                </td>
                                                <td className="py-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(type, idx)}
                                                        className="p-1 text-gray-400 hover:text-red-650 rounded transition"
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
        );
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => navigate('/bakery/nuwara-eliya')}
                    className="p-2 bg-white border border-gray-205 hover:bg-gray-50 rounded-xl transition text-gray-655"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                        Trip Settlement: {billNumber}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        Submit returns, deposits, and payments to close this consignment trip.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Returns & Stocks */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Loading Details Summary (Collapse-style Card) */}
                        <Card className="p-5 space-y-3 bg-slate-50/50 border-slate-100">
                            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Departure Loading Details</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-400 font-semibold">Loading Date</span>
                                    <p className="font-bold text-gray-700 mt-0.5">{dateText}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold">Loaded Cost</span>
                                    <p className="font-bold text-gray-700 mt-0.5">{formatPrice(loadCost)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold">Previous Outstanding</span>
                                    <p className="font-bold text-gray-750 mt-0.5">+{formatPrice(previousOutstanding)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 font-semibold">Total Loaded Bill</span>
                                    <p className="font-extrabold text-indigo-700 mt-0.5">{formatPrice(grossSubtotal)}</p>
                                </div>
                            </div>
                        </Card>

                        {renderItemsTable('returned', '2. Returned Products (Unsold)', returnedItems, returnSearch, setReturnSearch)}
                        {renderItemsTable('onboard', '3. Stock Remaining On-Board (Nuwara Eliya Inventory)', onBoardItems, onBoardSearch, setOnBoardSearch)}
                    </div>

                    {/* Settle Panel */}
                    <div className="space-y-6">
                        {/* Deductions Inputs */}
                        <Card className="p-6 space-y-4">
                            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Settlements & Deductions</h3>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bank Deposits Made</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={bankDeposits === 0 ? '' : bankDeposits}
                                        onChange={(e) => setBankDeposits(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-sm font-semibold text-green-600 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Local Shops Outstanding (Naya)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={shopsOutstanding === 0 ? '' : shopsOutstanding}
                                        onChange={(e) => setShopsOutstanding(Number(e.target.value) || 0)}
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-sm font-semibold text-amber-700 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                </div>
                            </div>
                        </Card>

                        {/* Balance sheet summary */}
                        <Card className="p-6 space-y-4 bg-indigo-50/20 border-indigo-100">
                            <h3 className="font-bold text-gray-800 text-sm border-b pb-2">Balance Sheet Summary</h3>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between font-semibold text-gray-700">
                                    <span>Total Loaded Bill:</span>
                                    <span>{formatPrice(grossSubtotal)}</span>
                                </div>
                                <div className="space-y-1 bg-white/40 p-2 rounded border border-gray-150">
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>- Bank Deposits:</span>
                                        <span>{formatPrice(bankDeposits)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>- Returns Cost:</span>
                                        <span>{formatPrice(returnsCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>- On-board Stock:</span>
                                        <span>{formatPrice(onBoardStockCost)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500 font-medium">
                                        <span>- Shops Naya:</span>
                                        <span>{formatPrice(shopsOutstanding)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t pt-1.5 text-gray-700">
                                        <span>Total Deductions:</span>
                                        <span>-{formatPrice(totalDeductions)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between font-extrabold text-sm border-t pt-2.5 text-slate-900 bg-slate-100/50 p-2 rounded">
                                    <span>Net Outstanding:</span>
                                    <span className={netOutstanding > 0 ? "text-amber-700" : "text-green-700"}>
                                        {formatPrice(netOutstanding)}
                                    </span>
                                </div>

                                <div className="border-t pt-3">
                                    <label className="block text-xs font-bold text-gray-650 uppercase tracking-wider mb-1">Cash Paid Today</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={amountPaid === 0 ? '' : amountPaid}
                                            onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                                            className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-sm font-bold text-indigo-650 focus:outline-none"
                                            placeholder="0.00"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">LKR</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-extrabold text-sm bg-indigo-50 p-2 rounded border border-indigo-150 text-indigo-900 mt-2">
                                    <span>Next Trip Carryover:</span>
                                    <span>{formatPrice(nextOutstanding)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Remarks */}
                <Card className="p-6">
                    <h3 className="font-bold text-gray-800 text-sm mb-3">Remarks / Settlement Notes</h3>
                    <textarea
                        rows="2"
                        placeholder="Add special notes about settlement, receipts details, return details..."
                        value={specialRemarks}
                        onChange={(e) => setSpecialRemarks(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold text-gray-755 focus:outline-none"
                    />
                </Card>

                {/* Buttons */}
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/bakery/nuwara-eliya')}
                        disabled={updateDelivery.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={updateDelivery.isPending}
                        className="flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Settlement
                    </Button>
                </div>
            </form>

            {activeSuggest.type !== null && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setActiveSuggest({ type: null, index: null })}
                />
            )}
        </div>
    );
}
