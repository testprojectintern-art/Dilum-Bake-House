import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Plus, Trash2, Save, X, Loader2, ArrowLeft, Search, RefreshCw, AlertTriangle,
    Download, MessageSquare, CheckCircle, Printer
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
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
    const [selectedShopContacts, setSelectedShopContacts] = useState([]);

    // Global product search bar
    const [productSearch, setProductSearch] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);
    const productSearchRef = useRef(null);

    const shopSuggestRef = useRef(null);

    // Click-outside handler for global product search
    useEffect(() => {
        const handler = (e) => {
            if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
                setShowProductSearch(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    // Load shop contacts when shopName changes or is loaded (for existing shops)
    useEffect(() => {
        const fetchShopContacts = async () => {
            if (!shopName.trim()) {
                setSelectedShopContacts([]);
                return;
            }
            try {
                const res = await bakeryApi.suggestShops(shopName);
                const exactMatch = res?.data?.find(s => s.name.toLowerCase() === shopName.trim().toLowerCase());
                if (exactMatch) {
                    setSelectedShopContacts(exactMatch.contacts || []);
                } else {
                    setSelectedShopContacts([]);
                }
            } catch (err) {
                console.error('Error fetching shop contacts', err);
            }
        };
        fetchShopContacts();
    }, [shopName]);

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

    // Quick-add product from global search bar
    const handleQuickAddProduct = (product) => {
        const alreadyIdx = items.findIndex(it => it.productName.toLowerCase() === product.name.toLowerCase());
        if (alreadyIdx !== -1) {
            // Already exists — just highlight the row (scroll into view)
            const rows = document.querySelectorAll('tbody tr');
            if (rows[alreadyIdx]) rows[alreadyIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            setItems(prev => [...prev, {
                productName: product.name,
                price: product.price || 0,
                morningQty: 0,
                afternoonQty: 0,
                returnQty: 0
            }]);
        }
        setProductSearch('');
        setShowProductSearch(false);
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

    // After-save state
    const [savedInvoice, setSavedInvoice] = useState(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const generateSavedInvoicePdf = async (invoice) => {
        const element = document.createElement('div');
        element.id = 'pdf-tmp';
        element.style.cssText = 'padding:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.4;width:198mm;background-color:#ffffff;color:#1e293b;box-sizing:border-box;';

        const morningItems = invoice.items.filter(i => i.morningQty > 0);
        const afternoonItems = invoice.items.filter(i => i.afternoonQty > 0);
        const returnItems = invoice.items.filter(i => i.returnQty > 0);
        let morningTotal = 0, afternoonTotal = 0, returnsTotal = 0;
        invoice.items.forEach(i => {
            morningTotal += (i.morningQty || 0) * (i.price || 0);
            afternoonTotal += (i.afternoonQty || 0) * (i.price || 0);
            returnsTotal += (i.returnQty || 0) * (i.price || 0);
        });

        const tRow = (label, qty, price) => `<tr><td style="font-weight:600;padding:7px 10px;border-bottom:1px solid #f1f5f9;">${label}</td><td style="text-align:right;padding:7px 10px;border-bottom:1px solid #f1f5f9;">${qty}</td><td style="text-align:right;padding:7px 10px;border-bottom:1px solid #f1f5f9;">${price.toFixed(2)}</td><td style="text-align:right;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1e3a8a;">${(qty * price).toFixed(2)}</td></tr>`;
        const thead = `<thead><tr><th style="text-align:left;background:#f1f5f9;padding:7px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;">Product</th><th style="text-align:right;background:#f1f5f9;padding:7px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;">Qty</th><th style="text-align:right;background:#f1f5f9;padding:7px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;">Price</th><th style="text-align:right;background:#f1f5f9;padding:7px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #cbd5e1;">Total LKR</th></tr></thead>`;
        const section = (title, color, items, getQty) => items.length === 0 ? '' : `<div style="font-size:12px;font-weight:900;text-transform:uppercase;color:${color};border-bottom:2px solid ${color};padding-bottom:4px;margin:20px 0 8px 0;">${title}</div><table style="width:100%;border-collapse:collapse;">${thead}<tbody>${items.map(i => tRow(i.productName, getQty(i), i.price)).join('')}</tbody></table>`;

        element.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a8a;padding-bottom:12px;margin-bottom:18px;">
            <div><h1 style="font-size:24px;font-weight:900;color:#1e3a8a;margin:0 0 4px 0;">DILUM BAKE HOUSE</h1><p style="font-size:10px;color:#64748b;margin:0 0 2px 0;">39/A, Muruthalawa road, Dehideniya, Peradeniya</p><p style="font-size:10px;color:#64748b;margin:0;">Tel: 0762125472 / 0774334046</p></div>
            <div style="text-align:right;"><h2 style="font-size:22px;font-weight:900;color:#1e3a8a;margin:0 0 6px 0;">INVOICE</h2><div style="font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;padding:8px;border-radius:6px;min-width:200px;display:inline-block;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="color:#64748b;">Invoice No:</span><span style="font-weight:700;color:#1e3a8a;">${invoice.invoiceNumber}</span></div><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="color:#64748b;">Date:</span><span style="font-weight:700;">${new Date(invoice.date).toLocaleDateString()}</span></div><div style="display:flex;justify-content:space-between;"><span style="color:#64748b;">Status:</span><span style="font-weight:700;color:${invoice.newBalance <= 0 ? '#16a34a' : '#dc2626'}">${invoice.newBalance <= 0 ? 'Paid' : 'Unpaid'}</span></div></div></div>
          </div>
          <div style="margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;"><h3 style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin:0 0 5px 0;">Billed To</h3><div style="font-size:14px;font-weight:800;color:#1e293b;text-transform:uppercase;">${invoice.shopName}</div>${invoice.shopPhone ? `<div style="font-size:11px;color:#475569;margin-top:3px;">Phone: <strong>${invoice.shopPhone}</strong></div>` : ''}</div>
          ${section('Morning Deliveries', '#1e3a8a', morningItems, i => i.morningQty)}
          ${section('Afternoon Deliveries', '#1e3a8a', afternoonItems, i => i.afternoonQty)}
          ${section('Returns Received', '#b91c1c', returnItems, i => i.returnQty)}
          <div style="display:flex;gap:20px;justify-content:flex-end;margin-top:22px;">
            <div style="width:300px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:13px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#475569;"><span>Morning:</span><span style="font-weight:600;">${morningTotal.toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#475569;"><span>Afternoon:</span><span style="font-weight:600;">${afternoonTotal.toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-weight:800;background:#eff6ff;border-radius:5px;padding:5px 9px;color:#1e3a8a;"><span>Today Total (Delivered):</span><span>${(morningTotal+afternoonTotal).toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#475569;"><span>Less Returns:</span><span style="font-weight:600;color:#dc2626;">-${returnsTotal.toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:7px;color:#475569;border-bottom:1px dashed #cbd5e1;padding-bottom:5px;"><span>Old Outstanding:</span><span style="font-weight:600;">${(invoice.oldBalance||0).toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-weight:800;font-size:14px;"><span>Grand Total:</span><span style="color:#1e3a8a;">${(invoice.grandTotal||0).toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-weight:800;font-size:14px;border-bottom:1px dashed #cbd5e1;padding-bottom:5px;"><span>Amount Paid Today:</span><span style="color:#16a34a;">-${(invoice.amountReceived||0).toFixed(2)} LKR</span></div>
              <div style="display:flex;justify-content:space-between;font-weight:950;font-size:15px;"><span>Net Outstanding:</span><span style="color:#dc2626;">${(invoice.newBalance||0).toFixed(2)} LKR</span></div>
            </div>
          </div>
          <div style="text-align:center;font-size:9px;margin-top:36px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;font-style:italic;">Delight in every bite! Thank you for your continued partnership with Dilum Bake House.</div>
        `;
        document.body.appendChild(element);
        const opts = { margin:6, filename:`${invoice.invoiceNumber}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:1.5,useCORS:true,logging:false}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
        try {
            const blob = await html2pdf().from(element).set(opts).output('blob');
            document.body.removeChild(element);
            return blob;
        } catch(e) { document.body.removeChild(element); throw e; }
    };

    const handleDownloadSavedPdf = async () => {
        if (!savedInvoice) return;
        setIsDownloadingPdf(true);
        try {
            const blob = await generateSavedInvoicePdf(savedInvoice);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${savedInvoice.invoiceNumber}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('PDF downloaded!');
        } catch(e) { toast.error('PDF generation failed.'); }
        finally { setIsDownloadingPdf(false); }
    };

    const handleShareSaved = async () => {
        if (!savedInvoice) return;
        setIsDownloadingPdf(true);
        try {
            const blob = await generateSavedInvoicePdf(savedInvoice);
            const file = new File([blob], `${savedInvoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: `Invoice #${savedInvoice.invoiceNumber}`, text: `Dilum Bake House - ${savedInvoice.shopName}` });
            } else {
                // Fallback: download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${savedInvoice.invoiceNumber}.pdf`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast('Sharing not supported — PDF downloaded instead.');
            }
        } catch(e) { if (e.name !== 'AbortError') toast.error('Share failed.'); }
        finally { setIsDownloadingPdf(false); }
    };


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
                { onSuccess: () => navigate('/bakery/invoices') }
            );
        } else {
            createInvoice.mutate(data, {
                onSuccess: (res) => {
                    const inv = res?.data || res;
                    toast.success(`Invoice ${inv?.invoiceNumber || ''} created successfully!`);
                    navigate('/bakery/invoices');
                }
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

    const filteredItems = items
        .map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter(item => {
            if (!productSearch.trim()) return true;
            if (!item.productName) return true;
            return item.productName.toLowerCase().includes(productSearch.toLowerCase());
        });

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

                            <div className="sm:col-span-2 animate-in fade-in duration-150">
                                <Input
                                    label="Phone Number(s) for Invoice"
                                    placeholder="e.g. 0762125472, 0774334046 (separate with commas)"
                                    value={shopPhone}
                                    onChange={(e) => setShopPhone(e.target.value)}
                                />
                                {selectedShopContacts.length > 0 && (
                                    <div className="mt-2.5">
                                        <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Shop Contacts (Click to add to phone)</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedShopContacts.map((c, i) => {
                                                const isAlreadyAdded = shopPhone.includes(c.phone);
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isAlreadyAdded) {
                                                                // Remove number
                                                                const parts = shopPhone.split(',').map(p => p.trim()).filter(p => p !== c.phone);
                                                                setShopPhone(parts.join(', '));
                                                            } else {
                                                                // Add number
                                                                const parts = shopPhone ? shopPhone.split(',').map(p => p.trim()) : [];
                                                                parts.push(c.phone);
                                                                setShopPhone(parts.join(', '));
                                                            }
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition duration-150 ${
                                                            isAlreadyAdded 
                                                                ? 'bg-indigo-50 text-indigo-755 border-indigo-300 shadow-sm' 
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <span className="font-bold uppercase text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-655">
                                                            {c.role}
                                                        </span>
                                                        <span>{c.phone}</span>
                                                        {c.name && <span className="text-gray-400 font-normal">({c.name})</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-sm font-bold text-gray-700 focus:outline-none"
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
                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-12 pr-3 py-1.5 text-sm font-bold text-green-600 focus:outline-none"
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

                    {/* Filter Product List Bar */}
                    <div className="relative mb-4">
                        <div className="relative flex items-center">
                            <Search className="absolute left-3.5 text-indigo-400 w-4 h-4 pointer-events-none z-10" />
                            <input
                                type="text"
                                placeholder="Filter products in this bill (type product name)..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="w-full bg-indigo-50/40 border border-indigo-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-10 pr-10 py-2 text-sm font-semibold text-gray-800 focus:outline-none transition placeholder:text-gray-400 placeholder:font-normal"
                                autoComplete="off"
                            />
                            {productSearch && (
                                <button
                                    type="button"
                                    onClick={() => setProductSearch('')}
                                    className="absolute right-3.5 text-gray-400 hover:text-gray-600 transition"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[250px]">
                        <table className="w-full text-sm block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase md:table-row">
                                    <th className="px-4 py-2.5 text-left md:table-cell" style={{ width: '35%' }}>Product Name</th>
                                    <th className="px-3 py-2.5 text-right md:table-cell" style={{ width: '15%' }}>Price (LKR)</th>
                                    <th className="px-3 py-2.5 text-right md:table-cell" style={{ width: '12%' }}>Morning Delivered</th>
                                    <th className="px-3 py-2.5 text-right md:table-cell" style={{ width: '12%' }}>Afternoon Delivered</th>
                                    <th className="px-3 py-2.5 text-right md:table-cell" style={{ width: '12%' }}>Returns</th>
                                    <th className="px-4 py-2.5 text-right md:table-cell" style={{ width: '10%' }}>Net Subtotal</th>
                                    <th className="py-2.5 text-center md:table-cell" style={{ width: '4%' }}></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 block md:table-row-group">
                                {items.length === 0 ? (
                                    <tr className="block md:table-row">
                                        <td colSpan="7" className="text-center text-gray-400 py-12 block md:table-cell">
                                            No products added yet. Choose a billing structure above or click 'Add Product Line'.
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr className="block md:table-row">
                                        <td colSpan="7" className="text-center text-gray-400 py-12 block md:table-cell">
                                            No products match your filter. Clear the filter bar to show all.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const origIdx = item.originalIndex;
                                        const matchingProducts = item.productName
                                            ? dbProducts.filter(p => p.name.toLowerCase().includes(item.productName.toLowerCase()))
                                            : dbProducts;

                                        const netSub = ((item.morningQty + item.afternoonQty) - item.returnQty) * (item.price || 0);

                                        return (
                                            <tr key={origIdx} className="grid grid-cols-2 gap-3 p-4 border-b border-gray-150 hover:bg-gray-50/50 md:table-row md:p-0 md:border-b-0">
                                                {/* Product Name */}
                                                <td className="col-span-2 md:table-cell px-0 md:px-4 py-0 md:py-3 relative">
                                                    <label className="block md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Product name..."
                                                            value={item.productName}
                                                            onChange={(e) => handleItemFieldChange(origIdx, 'productName', e.target.value)}
                                                            onFocus={() => setActiveRowSuggestIndex(origIdx)}
                                                            className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none"
                                                            required
                                                        />
                                                    </div>
                                                    {/* Floating suggestions dropdown */}
                                                    {activeRowSuggestIndex === origIdx && matchingProducts.length > 0 && (
                                                        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto py-1">
                                                            {matchingProducts.map((p) => (
                                                                <button
                                                                    key={p._id}
                                                                    type="button"
                                                                    onClick={() => handleSelectProductSuggestion(origIdx, p.name)}
                                                                    className="w-full px-4 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition text-left text-sm font-semibold"
                                                                >
                                                                    {p.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Price */}
                                                <td className="col-span-1 md:table-cell px-0 md:px-3 py-0 md:py-3">
                                                    <label className="block md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Price (LKR)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={item.price === 0 ? '' : item.price}
                                                        onChange={(e) => handleItemFieldChange(origIdx, 'price', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-700 focus:outline-none"
                                                    />
                                                </td>

                                                {/* Morning Delivered */}
                                                <td className="col-span-1 md:table-cell px-0 md:px-3 py-0 md:py-3">
                                                    <label className="block md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Morning Qty</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.morningQty === 0 ? '' : item.morningQty}
                                                        onChange={(e) => handleItemFieldChange(origIdx, 'morningQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-750 focus:outline-none"
                                                    />
                                                </td>

                                                {/* Afternoon Delivered */}
                                                <td className="col-span-1 md:table-cell px-0 md:px-3 py-0 md:py-3">
                                                    <label className="block md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Afternoon Qty</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.afternoonQty === 0 ? '' : item.afternoonQty}
                                                        onChange={(e) => handleItemFieldChange(origIdx, 'afternoonQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-gray-750 focus:outline-none"
                                                    />
                                                </td>

                                                {/* Returns */}
                                                <td className="col-span-1 md:table-cell px-0 md:px-3 py-0 md:py-3">
                                                    <label className="block md:hidden text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1">Returns Qty</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={item.returnQty === 0 ? '' : item.returnQty}
                                                        onChange={(e) => handleItemFieldChange(origIdx, 'returnQty', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-2 py-1.5 text-sm font-semibold text-right text-red-600 focus:outline-none"
                                                    />
                                                </td>

                                                {/* Net Subtotal */}
                                                <td className="col-span-1 md:table-cell px-0 md:px-4 py-0 md:py-3 text-right font-bold text-gray-800 flex flex-col justify-end md:justify-start md:block">
                                                    <label className="block md:hidden text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 text-right">Net Subtotal</label>
                                                    <span className="md:inline-block py-1 md:py-0">{formatPrice(netSub)}</span>
                                                </td>

                                                {/* Delete Action */}
                                                <td className="col-span-1 md:table-cell px-0 py-0 md:py-3 text-center flex items-center justify-end md:justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(origIdx)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
