import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Save, X,
    Package, AlertCircle, UserPlus, PackagePlus, CreditCard,
    CheckCircle, ArrowLeft, LayoutGrid, List
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { stockApi } from '../features/stock/stockApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCategories } from '../features/products/useProducts';
import { useCreateSalesOrder } from '../features/salesOrders/useSalesOrders';
import QuickCreateCustomerModal from '../features/customers/QuickCreateCustomerModal';
import { useMobile } from '../hooks/useMobile';

import { useAuthStore } from '../store/authStore';

export default function PosPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const createOrder = useCreateSalesOrder();
    const isMobile = useMobile();
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);

    // Cart state
    const [customerId, setCustomerId] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [cart, setCart] = useState([]); // [{ productId, name, code, price, qty, available, taxRate, taxable }]
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);

    // Modals
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Data
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'pos'],
        queryFn: () => productsApi.list({ status: 'active', canBeSold: true, limit: 500 }),
    });
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'pos', sourceWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: sourceWarehouseId, limit: 500 }),
        enabled: !!sourceWarehouseId,
    });
    const [taxMode, setTaxMode] = useState('item'); // 'item' = use product's tax rate, 'override' = use override
    const [overrideTaxRate, setOverrideTaxRate] = useState(18);

    const warehouses = warehousesData?.data || [];
    const customers = customersData?.data || [];
    const products = (productsData?.data || []).filter((p) => p.canBeSold !== false);
    const categories = categoriesData?.data || [];
    const stockItems = stockData?.data || [];

    // Set default warehouse
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const assignedVan = warehouses.find((w) => w.assignedRep === user?._id || w.assignedRep?._id === user?._id);
            const def = assignedVan || warehouses.find((w) => w.isDefault) || warehouses[0];
            if (def) setSourceWarehouseId(def._id);
        }
    }, [warehouses, sourceWarehouseId, user]);

    // Auto-select Walk-in Customer
    useEffect(() => {
        if (!customerId && customers.length > 0) {
            const walkIn = customers.find(c => c.displayName?.toLowerCase().includes('walk-in') || c.customerCode === 'CUST-1');
            if (walkIn) setCustomerId(walkIn._id);
        }
    }, [customers, customerId]);

    // Build stock map
    const stockMap = useMemo(() => {
        const map = new Map();
        stockItems.forEach((s) => {
            const pid = s.productId?._id || s.productId;
            const existing = map.get(pid) || { onHand: 0, reserved: 0 };
            existing.onHand += s.quantities?.onHand || 0;
            existing.reserved += s.quantities?.reserved || 0;
            map.set(pid, existing);
        });
        return map;
    }, [stockItems]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (activeCategory !== 'all') {
            result = result.filter((p) => (p.categoryId?._id || p.categoryId) === activeCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
                || p.productCode?.toLowerCase().includes(q)
                || p.barcode?.toLowerCase().includes(q)
            );
        }
        return result.slice(0, 60); // limit display
    }, [products, activeCategory, searchQuery]);

    const selectedCustomer = customers.find((c) => c._id === customerId);
    const customerOptions = customers.map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`,
    }));

    // Cart actions
    const addToCart = (product) => {
        const stock = stockMap.get(product._id);
        const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;

        if (available <= 0) {
            toast.error(`${product.name} is out of stock at this warehouse`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                if (existing.qty >= available) {
                    toast.error(`Only ${available} available`);
                    return prev;
                }
                return prev.map((i) => i.productId === product._id
                    ? { ...i, qty: i.qty + 1 } : i);
            }

            let price = product.basePrice;
            if (selectedCustomer?.defaultDiscountPercent) {
                price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }

            return [...prev, {
                productId: product._id,
                name: product.name,
                code: product.productCode,
                price: +price.toFixed(2),
                qty: 1,
                available,
                taxRate: product.tax?.taxRate || 0,
                taxable: product.tax?.taxable !== false,
                unitOfMeasure: product.unitOfMeasure,
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = i.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter(Boolean));
    };

    const setQty = (productId, qty) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = Math.max(0, +qty || 0);
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter((i) => i.qty > 0));
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear all items?')) setCart([]);
    };

    // Totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        cart.forEach((item) => {
            const lineSub = item.qty * item.price;
            subtotal += lineSub;
            if (taxMode === 'override') {
                totalTax += lineSub * ((+overrideTaxRate || 0) / 100);
            } else if (item.taxable) {
                totalTax += lineSub * (item.taxRate / 100);
            }
        });
        const orderDisc = subtotal * (+orderDiscountPercent || 0) / 100;
        const grandTotal = subtotal - orderDisc + totalTax;
        return {
            subtotal: +subtotal.toFixed(2),
            orderDiscount: +orderDisc.toFixed(2),
            totalTax: +totalTax.toFixed(2),
            grandTotal: +grandTotal.toFixed(2),
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
        };
    }, [cart, orderDiscountPercent, taxMode, overrideTaxRate]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleCheckout = async (saveAsDraft = false) => {
        if (!customerId) { toast.error('Select a customer'); return; }
        if (!sourceWarehouseId) { toast.error('Select a warehouse'); return; }
        if (cart.length === 0) { toast.error('Cart is empty'); return; }

        const payload = {
            customerId,
            sourceWarehouseId,
            source: 'pos',
            items: cart.map((i) => ({
                productId: i.productId,
                orderedQuantity: i.qty,
                unitPrice: i.price,
                taxRate: taxMode === 'override' ? (+overrideTaxRate || 0) : i.taxRate,
                taxable: taxMode === 'override' ? (+overrideTaxRate || 0) > 0 : i.taxable,
                discountPercent: 0,
            })),
            orderDiscount: orderDiscountPercent > 0
                ? { type: 'percentage', value: +orderDiscountPercent }
                : undefined,
            status: saveAsDraft ? 'draft' : 'approved',
        };

        try {
            const result = await createOrder.mutateAsync(payload);
            if (saveAsDraft) {
                toast.success('Order saved as draft');
                navigate(`/sales-orders/${result.data._id}`);
            } else {
                toast.success('Sale complete! Invoice generated automatically.');
                setCart([]);
                setCustomerId('');
                setOrderDiscountPercent(0);
                setTaxMode('item');
                navigate('/invoices');
            }
        } catch { }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 -m-4 md:-m-6">
            {/* Top bar */}
            <div className="bg-white border-b px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => navigate('/sales-orders')}>
                        <ArrowLeft size={14} className="mr-1" /> Back
                    </Button>
                    <h1 className="font-bold text-lg flex items-center gap-2 md:hidden">
                        <ShoppingCart size={20} /> POS
                    </h1>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="w-full sm:w-72 flex gap-1 items-end">
                        <div className="flex-1">
                            <Select placeholder="Select customer..." options={customerOptions}
                                value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(true)} title="Quick add">
                            <UserPlus size={14} />
                        </Button>
                    </div>

                    <div className="w-full sm:w-56">
                        <Select placeholder="Warehouse"
                            options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                            value={sourceWarehouseId} onChange={(e) => { setSourceWarehouseId(e.target.value); setCart([]); }} />
                    </div>

                    {selectedCustomer && (
                        <div className="text-xs text-gray-600 self-start sm:self-center">
                            <p>Credit: <span className="font-semibold">{fmt(selectedCustomer.creditStatus?.availableCredit || 0)}</span></p>
                            {selectedCustomer.creditStatus?.onCreditHold && (
                                <Badge variant="danger">On Credit Hold</Badge>
                            )}
                        </div>
                    )}
                </div>

                <h1 className="hidden md:flex font-bold text-lg items-center gap-2">
                    <ShoppingCart size={20} /> POS
                </h1>
            </div>

            {/* Main 2-column layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left: Product catalog */}
                <div className={`flex-1 flex flex-col bg-gray-50 p-4 overflow-hidden ${isMobile && showCartOnMobile ? 'hidden' : 'flex'}`}>
                    {/* Search */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1 mb-3 overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                }`}>
                            All
                        </button>
                        {categories.map((c) => (
                            <button key={c._id} onClick={() => setActiveCategory(c._id)}
                                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeCategory === c._id ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                    }`}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Product grid */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                                <p>No products found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredProducts.map((p) => {
                                    const stock = stockMap.get(p._id);
                                    const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;
                                    const inCart = cart.find((i) => i.productId === p._id)?.qty || 0;
                                    const outOfStock = available <= 0;

                                    return (
                                        <button
                                            key={p._id}
                                            onClick={() => addToCart(p)}
                                            disabled={outOfStock}
                                            className={`text-left bg-white border rounded-lg p-3 transition-all ${outOfStock
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:shadow-md active:scale-95'
                                                } ${inCart > 0 ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : ''}`}>
                                            <div className="aspect-square bg-gray-50 rounded mb-2 flex items-center justify-center border border-gray-100">
                                                <Package size={24} className="text-gray-300" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-800 line-clamp-1 mb-0.5">{p.name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mb-1">{p.productCode}</p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <p className="text-xs font-black text-primary-600">{fmt(p.basePrice)}</p>
                                                <Badge variant={outOfStock ? 'danger' : available <= 5 ? 'warning' : 'success'} className="px-1 py-0 text-[10px]">
                                                    {outOfStock ? 'Out' : available}
                                                </Badge>
                                            </div>
                                            {inCart > 0 && (
                                                <div className="mt-1 text-[10px] text-primary-700 font-bold flex items-center gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-primary-500" />
                                                    {inCart} in cart
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Cart (Fixed width on desktop, full screen on mobile when active) */}
                <div className={`${isMobile ? (showCartOnMobile ? 'fixed inset-0 z-50 flex' : 'hidden') : 'w-96 flex'} bg-white border-l flex-col`}>
                    <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            {isMobile && (
                                <button onClick={() => setShowCartOnMobile(false)} className="p-2 -ml-2 text-gray-400">
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            <h2 className="font-bold flex items-center gap-2">
                                <ShoppingCart size={18} /> Cart
                                {totals.itemCount > 0 && <Badge>{totals.itemCount}</Badge>}
                            </h2>
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-600 font-semibold hover:underline">Clear all</button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {cart.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Cart is empty</p>
                                <button onClick={() => setShowCartOnMobile(false)} className="mt-4 text-primary-600 text-sm font-bold md:hidden">Browse Products</button>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.productId} className="border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{item.code}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.productId)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg p-0.5 shadow-sm">
                                            <button onClick={() => updateQty(item.productId, -1)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500 rounded-md">
                                                <Minus size={14} />
                                            </button>
                                            <input type="number" value={item.qty} min="1" max={item.available}
                                                onChange={(e) => setQty(item.productId, e.target.value)}
                                                className="w-10 text-center text-sm font-bold bg-transparent border-0 focus:ring-0 p-0" />
                                            <button onClick={() => updateQty(item.productId, 1)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-gray-500 rounded-md">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <p className="text-sm font-black text-gray-900">{fmt(item.qty * item.price)}</p>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-medium">
                                        <span>{fmt(item.price)} {item.unitOfMeasure ? `/ ${item.unitOfMeasure}` : ''}</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded-full">{item.available} in stock</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary */}
                    <div className="border-t p-4 space-y-3 bg-gray-50 sticky bottom-0">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                <span>Subtotal</span><span>{fmt(totals.subtotal)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium">Discount %</span>
                                <input type="number" min="0" max="100" step="0.01"
                                    value={orderDiscountPercent}
                                    onChange={(e) => setOrderDiscountPercent(e.target.value)}
                                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-right font-bold focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium">Tax {taxMode === 'override' ? '(Overridden)' : ''}</span>
                                <div className="flex items-center gap-2">
                                    {taxMode === 'override' ? (
                                        <div className="flex items-center gap-1">
                                            <input type="number" min="0" max="100" step="0.01"
                                                value={overrideTaxRate}
                                                onChange={(e) => setOverrideTaxRate(e.target.value)}
                                                className="w-12 px-1.5 py-0.5 border border-amber-200 rounded text-[10px] text-right font-bold focus:ring-1 focus:ring-amber-500 outline-none bg-amber-50" />
                                            <button onClick={() => setTaxMode('item')} className="text-[10px] text-amber-600 font-bold hover:underline">Reset</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setTaxMode('override')} className="text-[10px] text-primary-600 font-bold hover:underline">Override</button>
                                    )}
                                    <span className="text-xs font-bold text-gray-700">{fmt(totals.totalTax)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-3 border-t border-gray-200">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="text-xl font-black text-primary-600 leading-none">{fmt(totals.grandTotal)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <Button variant="outline" onClick={() => handleCheckout(true)}
                                disabled={cart.length === 0 || !customerId} loading={createOrder.isPending}>
                                <Save size={14} className="mr-1" /> Draft
                            </Button>
                            <Button variant="primary" onClick={() => handleCheckout(false)}
                                disabled={cart.length === 0 || !customerId} loading={createOrder.isPending}>
                                <CreditCard size={14} className="mr-1" /> Checkout
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Cart Toggle Button */}
                {isMobile && !showCartOnMobile && (
                    <button
                        onClick={() => setShowCartOnMobile(true)}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
                    >
                        <div className="relative">
                            <ShoppingCart size={24} />
                            {totals.itemCount > 0 && (
                                <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {totals.itemCount}
                                </span>
                            )}
                        </div>
                    </button>
                )}
            </div>

            <QuickCreateCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onCreated={(c) => setCustomerId(c._id)}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}